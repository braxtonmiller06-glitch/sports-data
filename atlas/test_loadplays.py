"""Tests for atlas/loadplays.py. No live API calls -- balldontlie.get_games_for_date
and db.insert_pick are mocked wherever load_plays() (the orchestrator) is
exercised; build_pick_row() itself takes games_by_sport as a plain argument
so most tests don't need mocking at all.
"""
import json
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import mock_open, patch

from atlas import loadplays


class ComputeSettlesAtTests(unittest.TestCase):
    def setUp(self):
        self.start = datetime(2026, 8, 1, 18, 0, tzinfo=timezone.utc)

    def test_mlb_buffer(self):
        result = loadplays.compute_settles_at("mlb", self.start)
        self.assertEqual(result, self.start + timedelta(hours=4))

    def test_wnba_buffer(self):
        result = loadplays.compute_settles_at("wnba", self.start)
        self.assertEqual(result, self.start + timedelta(hours=2.5))

    def test_soccer_buffer_applies_to_every_league_string(self):
        expected = self.start + timedelta(hours=2.5)
        for league in ("mls", "epl", "la_liga", "serie_a", "bundesliga", "ligue_1"):
            with self.subTest(league=league):
                self.assertEqual(loadplays.compute_settles_at(league, self.start), expected)

    def test_unknown_sport_raises(self):
        with self.assertRaises(ValueError):
            loadplays.compute_settles_at("cricket", self.start)

    def test_buffers_are_exactly_the_configured_values(self):
        # Locks in the tunable dict itself, not just the resulting math.
        self.assertEqual(loadplays.SETTLE_BUFFERS["mlb"], timedelta(hours=4))
        self.assertEqual(loadplays.SETTLE_BUFFERS["wnba"], timedelta(hours=2.5))
        self.assertEqual(loadplays.SETTLE_BUFFERS["soccer"], timedelta(hours=2.5))


class ThreeWayTests(unittest.TestCase):
    def test_soccer_moneyline_is_three_way(self):
        self.assertTrue(loadplays.is_three_way("epl", "moneyline"))
        self.assertTrue(loadplays.is_three_way("mls", "1x2"))

    def test_soccer_non_moneyline_is_not_three_way(self):
        self.assertFalse(loadplays.is_three_way("epl", "total"))

    def test_non_soccer_moneyline_is_not_three_way(self):
        self.assertFalse(loadplays.is_three_way("mlb", "moneyline"))
        self.assertFalse(loadplays.is_three_way("wnba", "moneyline"))


class ResolveSelectionSideTests(unittest.TestCase):
    def test_literal_values_pass_through(self):
        for value in ("home", "away", "over", "under", "draw"):
            self.assertEqual(loadplays.resolve_selection_side(value, None), value)

    def test_team_name_resolves_against_matched_game(self):
        game = {"home_team": "Arsenal", "away_team": "Chelsea"}
        self.assertEqual(loadplays.resolve_selection_side("Arsenal", game), "home")
        self.assertEqual(loadplays.resolve_selection_side("Chelsea", game), "away")

    def test_unmatchable_selection_raises(self):
        with self.assertRaises(ValueError):
            loadplays.resolve_selection_side("Some Random Team", {"home_team": "Arsenal", "away_team": "Chelsea"})


class ValidatePickTests(unittest.TestCase):
    def _valid_pick(self, **overrides) -> dict:
        pick = {
            "sport": "mlb",
            "market_type": "moneyline",
            "subject": "Yankees",
            "home_team": "Yankees",
            "away_team": "Red Sox",
            "selection_side": "home",
            "three_way": False,
            "decimal_odds": 1.91,
            "model_probability": 0.55,
            "market_probability": 0.52,
            "edge": 0.03,
            "confidence": 60.0,
            "verdict": "BET",
            "settles_at": "2026-08-01T22:00:00+00:00",
        }
        pick.update(overrides)
        return pick

    def test_valid_pick_passes(self):
        loadplays.validate_pick(self._valid_pick())  # should not raise

    def test_missing_field_reports_that_exact_field(self):
        pick = self._valid_pick()
        del pick["edge"]
        with self.assertRaises(loadplays.PickValidationError) as ctx:
            loadplays.validate_pick(pick)
        self.assertEqual(ctx.exception.field, "edge")

    def test_null_field_reports_that_exact_field(self):
        pick = self._valid_pick(confidence=None)
        with self.assertRaises(loadplays.PickValidationError) as ctx:
            loadplays.validate_pick(pick)
        self.assertEqual(ctx.exception.field, "confidence")

    def test_two_way_side_rejected_for_three_way_pick(self):
        pick = self._valid_pick(sport="epl", market_type="moneyline", three_way=True, selection_side="over")
        with self.assertRaises(loadplays.PickValidationError) as ctx:
            loadplays.validate_pick(pick)
        self.assertEqual(ctx.exception.field, "selection_side")

    def test_three_way_side_rejected_for_two_way_pick(self):
        pick = self._valid_pick(selection_side="draw")
        with self.assertRaises(loadplays.PickValidationError) as ctx:
            loadplays.validate_pick(pick)
        self.assertEqual(ctx.exception.field, "selection_side")

    def test_draw_accepted_for_three_way_pick(self):
        pick = self._valid_pick(sport="epl", market_type="moneyline", three_way=True, selection_side="draw")
        loadplays.validate_pick(pick)  # should not raise

    def test_bad_decimal_odds_rejected(self):
        pick = self._valid_pick(decimal_odds=0.8)
        with self.assertRaises(loadplays.PickValidationError) as ctx:
            loadplays.validate_pick(pick)
        self.assertEqual(ctx.exception.field, "decimal_odds")

    def test_probability_out_of_range_rejected(self):
        pick = self._valid_pick(model_probability=1.2)
        with self.assertRaises(loadplays.PickValidationError) as ctx:
            loadplays.validate_pick(pick)
        self.assertEqual(ctx.exception.field, "model_probability")

    def test_bad_verdict_rejected(self):
        pick = self._valid_pick(verdict="MAYBE")
        with self.assertRaises(loadplays.PickValidationError) as ctx:
            loadplays.validate_pick(pick)
        self.assertEqual(ctx.exception.field, "verdict")


class BuildPickRowTests(unittest.TestCase):
    def test_matched_game_sets_external_event_id_and_settles_at(self):
        play = {
            "sport": "mlb", "market_type": "moneyline", "subject": "Yankees",
            "home_team": "Yankees", "away_team": "Red Sox", "selection": "Yankees",
            "decimal_odds": 1.91, "model_probability": 0.55, "market_probability": 0.52,
            "edge": 0.03, "confidence": 60.0, "verdict": "BET",
        }
        games_by_sport = {
            "mlb": [{"id": "12345", "start_time": "2026-08-01T18:00:00Z",
                     "home_team": "Yankees", "away_team": "Red Sox"}]
        }
        row = loadplays.build_pick_row(play, games_by_sport)
        self.assertEqual(row["external_event_id"], "12345")
        self.assertEqual(row["selection_side"], "home")
        self.assertFalse(row["three_way"])
        expected_settles_at = datetime(2026, 8, 1, 22, 0, tzinfo=timezone.utc)  # +4h MLB buffer
        self.assertEqual(row["settles_at"], expected_settles_at.isoformat())

    def test_unmatched_game_falls_back_to_play_start_time_with_null_event_id(self):
        play = {
            "sport": "wnba", "market_type": "player_points_over", "subject": "Player X",
            "home_team": "Team A", "away_team": "Team B", "selection": "over",
            "decimal_odds": 1.91, "model_probability": 0.55, "market_probability": 0.52,
            "edge": 0.03, "confidence": 60.0, "verdict": "PLAYABLE",
            "start_time": "2026-08-01T18:00:00Z",
        }
        row = loadplays.build_pick_row(play, games_by_sport={"wnba": []})
        self.assertIsNone(row["external_event_id"])
        expected_settles_at = datetime(2026, 8, 1, 20, 30, tzinfo=timezone.utc)  # +2.5h WNBA buffer
        self.assertEqual(row["settles_at"], expected_settles_at.isoformat())

    def test_no_game_and_no_fallback_start_time_raises(self):
        play = {
            "sport": "wnba", "market_type": "moneyline", "subject": "Team A",
            "home_team": "Team A", "away_team": "Team B", "selection": "home",
            "decimal_odds": 1.91, "model_probability": 0.55, "market_probability": 0.52,
            "edge": 0.03, "confidence": 60.0, "verdict": "BET",
        }
        with self.assertRaises(ValueError):
            loadplays.build_pick_row(play, games_by_sport={"wnba": []})

    def test_soccer_moneyline_is_three_way_with_draw_selection(self):
        play = {
            "sport": "epl", "market_type": "moneyline", "subject": "Arsenal",
            "home_team": "Arsenal", "away_team": "Chelsea", "selection": "draw",
            "decimal_odds": 3.4, "model_probability": 0.30, "market_probability": 0.28,
            "edge": 0.02, "confidence": 50.0, "verdict": "LEAN",
            "start_time": "2026-08-01T15:00:00Z",
        }
        row = loadplays.build_pick_row(play, games_by_sport={"epl": []})
        self.assertTrue(row["three_way"])
        self.assertEqual(row["selection_side"], "draw")
        loadplays.validate_pick(row)  # should not raise


class LoadPlaysOrchestrationTests(unittest.TestCase):
    """Exercises the full load_plays() flow with balldontlie and db mocked out --
    no live API or database calls.
    """

    def test_valid_and_invalid_plays_both_handled_without_network_calls(self):
        plays = [
            {
                "sport": "mlb", "market_type": "moneyline", "subject": "Yankees",
                "home_team": "Yankees", "away_team": "Red Sox", "selection": "Yankees",
                "decimal_odds": 1.91, "model_probability": 0.55, "market_probability": 0.52,
                "edge": 0.03, "confidence": 60.0, "verdict": "BET",
            },
            {
                # missing decimal_odds -- should be skipped, not crash the batch
                "sport": "mlb", "market_type": "moneyline", "subject": "Broken Pick",
                "home_team": "Yankees", "away_team": "Red Sox", "selection": "Yankees",
                "model_probability": 0.55, "market_probability": 0.52,
                "edge": 0.03, "confidence": 60.0, "verdict": "BET",
            },
        ]

        with patch("atlas.loadplays.balldontlie.get_games_for_date") as mock_games, \
                patch("atlas.loadplays.db.insert_pick") as mock_insert, \
                patch("builtins.open", mock_open(read_data=json.dumps(plays))):
            mock_games.return_value = [
                {"id": "999", "start_time": "2026-08-01T18:00:00Z", "home_team": "Yankees", "away_team": "Red Sox"}
            ]
            loadplays.load_plays("fake_path.json", game_date=None)

        mock_games.assert_called_once()
        mock_insert.assert_called_once()
        inserted_row = mock_insert.call_args[0][0]
        self.assertEqual(inserted_row["subject"], "Yankees")
        self.assertEqual(inserted_row["external_event_id"], "999")


if __name__ == "__main__":
    unittest.main()
