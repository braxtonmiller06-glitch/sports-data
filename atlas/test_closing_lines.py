"""Tests for atlas/closing_lines.py. No live API or database calls --
fetch_closing_odds/db.get_picks_without_closing_line/db.record_closing_line
are mocked wherever run() (the orchestrator) is exercised; the pure
functions (compute_clv_pct, find_picks_due, _match_odds_value) need no
mocking at all.
"""
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from atlas import closing_lines


def _pick(sport="mlb", settles_at="2026-08-01T22:00:00+00:00", market_type="moneyline", **overrides) -> dict:
    pick = {
        "id": 1,
        "sport": sport,
        "market_type": market_type,
        "subject": "Yankees",
        "home_team": "Yankees",
        "away_team": "Red Sox",
        "selection_side": "home",
        "decimal_odds": 2.10,
        "settles_at": settles_at,
    }
    pick.update(overrides)
    return pick


class ComputeClvPctTests(unittest.TestCase):
    def test_beating_the_closing_line_is_positive(self):
        # bet at 2.10, closes at 1.90 -- you got the better price
        self.assertAlmostEqual(closing_lines.compute_clv_pct(2.10, 1.90), (2.10 / 1.90 - 1) * 100)
        self.assertGreater(closing_lines.compute_clv_pct(2.10, 1.90), 0)

    def test_worse_than_closing_line_is_negative(self):
        self.assertLess(closing_lines.compute_clv_pct(1.80, 2.00), 0)

    def test_matching_the_close_is_zero(self):
        self.assertAlmostEqual(closing_lines.compute_clv_pct(1.95, 1.95), 0.0)


class FindPicksDueTests(unittest.TestCase):
    def test_pick_starting_in_10_minutes_is_due_within_15_minute_window(self):
        # MLB buffer is 4h, so settles_at = start + 4h -> start = settles_at - 4h
        now = datetime(2026, 8, 1, 18, 0, tzinfo=timezone.utc)
        start = now + timedelta(minutes=10)
        settles_at = (start + timedelta(hours=4)).isoformat()
        pick = _pick(settles_at=settles_at)
        self.assertEqual(closing_lines.find_picks_due([pick], now), [pick])

    def test_pick_starting_in_30_minutes_is_not_yet_due(self):
        now = datetime(2026, 8, 1, 18, 0, tzinfo=timezone.utc)
        start = now + timedelta(minutes=30)
        settles_at = (start + timedelta(hours=4)).isoformat()
        pick = _pick(settles_at=settles_at)
        self.assertEqual(closing_lines.find_picks_due([pick], now), [])

    def test_pick_that_already_started_is_not_due(self):
        now = datetime(2026, 8, 1, 18, 0, tzinfo=timezone.utc)
        start = now - timedelta(minutes=5)
        settles_at = (start + timedelta(hours=4)).isoformat()
        pick = _pick(settles_at=settles_at)
        self.assertEqual(closing_lines.find_picks_due([pick], now), [])

    def test_respects_per_sport_buffer_for_wnba(self):
        now = datetime(2026, 8, 1, 18, 0, tzinfo=timezone.utc)
        start = now + timedelta(minutes=5)
        settles_at = (start + timedelta(hours=2.5)).isoformat()  # WNBA buffer
        pick = _pick(sport="wnba", settles_at=settles_at)
        self.assertEqual(closing_lines.find_picks_due([pick], now), [pick])

    def test_soccer_league_string_resolves_to_soccer_buffer(self):
        now = datetime(2026, 8, 1, 18, 0, tzinfo=timezone.utc)
        start = now + timedelta(minutes=5)
        settles_at = (start + timedelta(hours=2.5)).isoformat()  # soccer buffer
        pick = _pick(sport="epl", settles_at=settles_at)
        self.assertEqual(closing_lines.find_picks_due([pick], now), [pick])


class MatchOddsValueTests(unittest.TestCase):
    """Expected values here are DECIMAL odds even where the input is American.

    These tests previously asserted the raw American number came back
    unchanged (-150.0, -110.0). That was the bug: the only consumer,
    compute_clv_pct, divides one price by another, which is meaningless
    unless both are decimal. -150 straight into that formula produced a
    confident, wildly wrong CLV that got written to the database as fact.
    _match_odds_value now normalizes; see _to_decimal_odds.
    """

    def test_matches_plain_home_away_labels(self):
        odds = {"Home": "-150", "Away": "+130"}
        # -150 -> 1 + 100/150; +130 -> 1 + 130/100
        self.assertAlmostEqual(
            closing_lines._match_odds_value(odds, "home", "Yankees", "Red Sox"), 1.6667, places=3
        )
        self.assertAlmostEqual(
            closing_lines._match_odds_value(odds, "away", "Yankees", "Red Sox"), 2.30, places=3
        )

    def test_matches_team_name_as_label(self):
        odds = {"Yankees": "1.85", "Red Sox": "2.05"}
        # Already decimal -- passed through untouched.
        self.assertEqual(closing_lines._match_odds_value(odds, "home", "Yankees", "Red Sox"), 1.85)

    def test_matches_spread_style_labels(self):
        odds = {"Home -3.5": "-110", "Away +3.5": "-110"}
        self.assertAlmostEqual(
            closing_lines._match_odds_value(odds, "home", "Yankees", "Red Sox"), 1.9091, places=3
        )

    def test_matches_total_style_labels(self):
        odds = {"Over 45.5": "-105", "Under 45.5": "-115"}
        self.assertAlmostEqual(
            closing_lines._match_odds_value(odds, "over", "Yankees", "Red Sox"), 1.9524, places=3
        )
        self.assertAlmostEqual(
            closing_lines._match_odds_value(odds, "under", "Yankees", "Red Sox"), 1.8696, places=3
        )

    def test_no_match_returns_none_rather_than_guessing(self):
        odds = {"Something Unrecognized": "-110"}
        self.assertIsNone(closing_lines._match_odds_value(odds, "home", "Yankees", "Red Sox"))

    def test_empty_or_none_odds_dict_returns_none(self):
        self.assertIsNone(closing_lines._match_odds_value(None, "home", "Yankees", "Red Sox"))
        self.assertIsNone(closing_lines._match_odds_value({}, "home", "Yankees", "Red Sox"))


class RunOrchestrationTests(unittest.TestCase):
    """Exercises run() end to end with the DB and odds fetch mocked out."""

    def test_non_game_level_market_is_skipped_not_errored(self):
        now = datetime(2026, 8, 1, 18, 0, tzinfo=timezone.utc)
        start = now + timedelta(minutes=5)
        settles_at = (start + timedelta(hours=4)).isoformat()
        prop_pick = _pick(market_type="player_points_over", settles_at=settles_at)

        with patch("atlas.closing_lines.init_db"), \
                patch("atlas.closing_lines.SessionLocal"), \
                patch("atlas.closing_lines.db.get_picks_without_closing_line", return_value=[prop_pick]), \
                patch("atlas.closing_lines.db.record_closing_line") as mock_record:
            summary = closing_lines.run(now=now)

        self.assertEqual(summary["skipped"], 1)
        self.assertEqual(summary["recorded"], 0)
        mock_record.assert_not_called()

    def test_matched_odds_recorded_with_correct_clv(self):
        now = datetime(2026, 8, 1, 18, 0, tzinfo=timezone.utc)
        start = now + timedelta(minutes=5)
        settles_at = (start + timedelta(hours=4)).isoformat()
        pick = _pick(settles_at=settles_at, decimal_odds=2.10)

        with patch("atlas.closing_lines.init_db"), \
                patch("atlas.closing_lines.SessionLocal"), \
                patch("atlas.closing_lines.db.get_picks_without_closing_line", return_value=[pick]), \
                patch("atlas.closing_lines.fetch_closing_odds", return_value=1.90), \
                patch("atlas.closing_lines.db.record_closing_line") as mock_record:
            summary = closing_lines.run(now=now)

        self.assertEqual(summary["recorded"], 1)
        mock_record.assert_called_once()
        pick_id, closing_odds, clv_pct = mock_record.call_args[0]
        self.assertEqual(pick_id, 1)
        self.assertEqual(closing_odds, 1.90)
        self.assertAlmostEqual(clv_pct, (2.10 / 1.90 - 1) * 100)

    def test_dry_run_never_calls_record_closing_line(self):
        now = datetime(2026, 8, 1, 18, 0, tzinfo=timezone.utc)
        start = now + timedelta(minutes=5)
        settles_at = (start + timedelta(hours=4)).isoformat()
        pick = _pick(settles_at=settles_at)

        with patch("atlas.closing_lines.init_db"), \
                patch("atlas.closing_lines.SessionLocal"), \
                patch("atlas.closing_lines.db.get_picks_without_closing_line", return_value=[pick]), \
                patch("atlas.closing_lines.fetch_closing_odds", return_value=1.90), \
                patch("atlas.closing_lines.db.record_closing_line") as mock_record:
            summary = closing_lines.run(dry_run=True, now=now)

        self.assertEqual(summary["recorded"], 1)
        mock_record.assert_not_called()

    def test_no_matching_odds_is_skipped(self):
        now = datetime(2026, 8, 1, 18, 0, tzinfo=timezone.utc)
        start = now + timedelta(minutes=5)
        settles_at = (start + timedelta(hours=4)).isoformat()
        pick = _pick(settles_at=settles_at)

        with patch("atlas.closing_lines.init_db"), \
                patch("atlas.closing_lines.SessionLocal"), \
                patch("atlas.closing_lines.db.get_picks_without_closing_line", return_value=[pick]), \
                patch("atlas.closing_lines.fetch_closing_odds", return_value=None), \
                patch("atlas.closing_lines.db.record_closing_line") as mock_record:
            summary = closing_lines.run(now=now)

        self.assertEqual(summary["skipped"], 1)
        mock_record.assert_not_called()

    def test_fetch_error_is_collected_not_raised(self):
        now = datetime(2026, 8, 1, 18, 0, tzinfo=timezone.utc)
        start = now + timedelta(minutes=5)
        settles_at = (start + timedelta(hours=4)).isoformat()
        pick = _pick(settles_at=settles_at)

        with patch("atlas.closing_lines.init_db"), \
                patch("atlas.closing_lines.SessionLocal"), \
                patch("atlas.closing_lines.db.get_picks_without_closing_line", return_value=[pick]), \
                patch("atlas.closing_lines.fetch_closing_odds", side_effect=RuntimeError("boom")), \
                patch("atlas.closing_lines.db.record_closing_line") as mock_record:
            summary = closing_lines.run(now=now)

        self.assertEqual(len(summary["errors"]), 1)
        self.assertEqual(summary["errors"][0]["pick_id"], 1)
        mock_record.assert_not_called()


if __name__ == "__main__":
    unittest.main()
