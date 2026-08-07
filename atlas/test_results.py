"""Tests for atlas/results.py. No live API or database calls --
api_sports_interface.get_games and db.* are mocked wherever run() is
exercised; grade_pick()/caption() are pure and need no mocking.
"""
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from atlas import results


def _game(home_score=None, away_score=None, final=True, home_team="Yankees", away_team="Red Sox") -> dict:
    return {
        "home_team": home_team,
        "away_team": away_team,
        "home_score": home_score,
        "away_score": away_score,
        "final_score": f"{home_score}-{away_score}" if final and home_score is not None else None,
    }


def _pick(market_type="moneyline", selection_side="home", line=None) -> dict:
    return {"market_type": market_type, "selection_side": selection_side, "line": line}


class GradePickMoneylineTests(unittest.TestCase):
    def test_home_win_grades_home_pick_as_win(self):
        self.assertEqual(results.grade_pick(_game(5, 2), _pick(selection_side="home")), "WIN")

    def test_home_win_grades_away_pick_as_loss(self):
        self.assertEqual(results.grade_pick(_game(5, 2), _pick(selection_side="away")), "LOSS")

    def test_tie_grades_draw_pick_as_push(self):
        self.assertEqual(results.grade_pick(_game(2, 2), _pick(market_type="1x2", selection_side="draw")), "PUSH")

    def test_tie_grades_home_pick_as_loss(self):
        self.assertEqual(results.grade_pick(_game(2, 2), _pick(selection_side="home")), "LOSS")

    def test_not_final_returns_none(self):
        self.assertIsNone(results.grade_pick(_game(None, None, final=False), _pick()))


class GradePickSpreadTests(unittest.TestCase):
    def test_favorite_covers(self):
        # home -3.5, home wins by 10 -> covers
        pick = _pick(market_type="spread", selection_side="home", line=-3.5)
        self.assertEqual(results.grade_pick(_game(20, 10), pick), "WIN")

    def test_favorite_fails_to_cover(self):
        # home -3.5, home wins by only 1 -> does not cover
        pick = _pick(market_type="spread", selection_side="home", line=-3.5)
        self.assertEqual(results.grade_pick(_game(11, 10), pick), "LOSS")

    def test_underdog_covers(self):
        # away +3.5, away loses by 2 -> covers
        pick = _pick(market_type="spread", selection_side="away", line=3.5)
        self.assertEqual(results.grade_pick(_game(10, 8), pick), "WIN")

    def test_exact_push(self):
        pick = _pick(market_type="spread", selection_side="home", line=-3.0)
        self.assertEqual(results.grade_pick(_game(13, 10), pick), "PUSH")

    def test_missing_line_returns_none(self):
        pick = _pick(market_type="spread", selection_side="home", line=None)
        self.assertIsNone(results.grade_pick(_game(20, 10), pick))


class GradePickTotalTests(unittest.TestCase):
    def test_over_wins_when_total_exceeds_line(self):
        pick = _pick(market_type="total", selection_side="over", line=8.5)
        self.assertEqual(results.grade_pick(_game(5, 5), pick), "WIN")

    def test_under_wins_when_total_below_line(self):
        pick = _pick(market_type="total", selection_side="under", line=8.5)
        self.assertEqual(results.grade_pick(_game(3, 2), pick), "WIN")

    def test_exact_total_is_push(self):
        pick = _pick(market_type="total", selection_side="over", line=10.0)
        self.assertEqual(results.grade_pick(_game(6, 4), pick), "PUSH")


class CaptionTests(unittest.TestCase):
    def test_no_graded_picks(self):
        self.assertIn("No picks graded", results.caption({"graded": [], "skipped": [], "errors": []}))

    def test_record_and_profit_formatting(self):
        summary = {
            "graded": [
                {"pick_id": 1, "subject": "Yankees", "result": "WIN", "stake": 100.0, "decimal_odds": 2.0},
                {"pick_id": 2, "subject": "Red Sox", "result": "LOSS", "stake": 50.0, "decimal_odds": 1.91},
                {"pick_id": 3, "subject": "Mets", "result": "PUSH", "stake": 75.0, "decimal_odds": 1.91},
            ],
            "skipped": [],
            "errors": [],
        }
        text = results.caption(summary)
        self.assertIn("1-1", text)  # push excluded from the W-L record, included in the count suffix
        # profit: +100 (win: 100 * (2.0-1)) - 50 (loss stake) + 0 (push) = +50.00
        self.assertIn("+50.00", text)

    def test_pushes_included_in_record_suffix(self):
        summary = {
            "graded": [
                {"pick_id": 1, "subject": "A", "result": "WIN", "stake": 10.0, "decimal_odds": 2.0},
                {"pick_id": 2, "subject": "B", "result": "PUSH", "stake": 10.0, "decimal_odds": 2.0},
            ],
            "skipped": [],
            "errors": [],
        }
        text = results.caption(summary)
        self.assertIn("1-0-1", text)


class RunOrchestrationTests(unittest.TestCase):
    def test_player_prop_is_skipped_with_clear_reason(self):
        pick = {
            "id": 1, "subject": "Player X", "sport": "wnba", "market_type": "player_points_over",
            "selection_side": "over", "home_team": "A", "away_team": "B",
            "settles_at": "2026-08-01T22:00:00+00:00", "line": 20.5, "decimal_odds": 1.9, "stake": None,
        }
        with patch("atlas.results.init_db"), patch("atlas.results.SessionLocal"), \
                patch("atlas.results.db.get_ungraded_settled_picks", return_value=[pick]), \
                patch("atlas.results.db.mark_graded") as mock_mark:
            summary = results.run(now=datetime(2026, 8, 1, 23, 0, tzinfo=timezone.utc))

        self.assertEqual(len(summary["skipped"]), 1)
        self.assertIn("player box scores", summary["skipped"][0]["reason"])
        mock_mark.assert_not_called()

    def test_graded_pick_marks_graded_when_not_dry_run(self):
        pick = {
            "id": 2, "subject": "Yankees", "sport": "mlb", "market_type": "moneyline",
            "selection_side": "home", "home_team": "Yankees", "away_team": "Red Sox",
            "settles_at": "2026-08-01T22:00:00+00:00", "line": None, "decimal_odds": 1.9, "stake": 50.0,
        }
        game = _game(5, 2, home_team="Yankees", away_team="Red Sox")
        with patch("atlas.results.init_db"), patch("atlas.results.SessionLocal"), \
                patch("atlas.results.db.get_ungraded_settled_picks", return_value=[pick]), \
                patch("atlas.results._find_final_game", return_value=game), \
                patch("atlas.results.db.mark_graded") as mock_mark:
            summary = results.run(now=datetime(2026, 8, 1, 23, 0, tzinfo=timezone.utc))

        self.assertEqual(len(summary["graded"]), 1)
        self.assertEqual(summary["graded"][0]["result"], "WIN")
        mock_mark.assert_called_once_with(2, "WIN", "2026-08-01T23:00:00+00:00")

    def test_dry_run_never_calls_mark_graded(self):
        pick = {
            "id": 3, "subject": "Yankees", "sport": "mlb", "market_type": "moneyline",
            "selection_side": "home", "home_team": "Yankees", "away_team": "Red Sox",
            "settles_at": "2026-08-01T22:00:00+00:00", "line": None, "decimal_odds": 1.9, "stake": 50.0,
        }
        game = _game(5, 2, home_team="Yankees", away_team="Red Sox")
        with patch("atlas.results.init_db"), patch("atlas.results.SessionLocal"), \
                patch("atlas.results.db.get_ungraded_settled_picks", return_value=[pick]), \
                patch("atlas.results._find_final_game", return_value=game), \
                patch("atlas.results.db.mark_graded") as mock_mark:
            summary = results.run(dry_run=True, now=datetime(2026, 8, 1, 23, 0, tzinfo=timezone.utc))

        self.assertEqual(len(summary["graded"]), 1)
        mock_mark.assert_not_called()

    def test_no_matching_game_is_skipped(self):
        pick = {
            "id": 4, "subject": "Yankees", "sport": "mlb", "market_type": "moneyline",
            "selection_side": "home", "home_team": "Yankees", "away_team": "Red Sox",
            "settles_at": "2026-08-01T22:00:00+00:00", "line": None, "decimal_odds": 1.9, "stake": 50.0,
        }
        with patch("atlas.results.init_db"), patch("atlas.results.SessionLocal"), \
                patch("atlas.results.db.get_ungraded_settled_picks", return_value=[pick]), \
                patch("atlas.results._find_final_game", return_value=None), \
                patch("atlas.results.db.mark_graded") as mock_mark:
            summary = results.run(now=datetime(2026, 8, 1, 23, 0, tzinfo=timezone.utc))

        self.assertEqual(len(summary["skipped"]), 1)
        mock_mark.assert_not_called()

    def test_lookup_error_is_collected_not_raised(self):
        pick = {
            "id": 5, "subject": "Yankees", "sport": "mlb", "market_type": "moneyline",
            "selection_side": "home", "home_team": "Yankees", "away_team": "Red Sox",
            "settles_at": "2026-08-01T22:00:00+00:00", "line": None, "decimal_odds": 1.9, "stake": 50.0,
        }
        with patch("atlas.results.init_db"), patch("atlas.results.SessionLocal"), \
                patch("atlas.results.db.get_ungraded_settled_picks", return_value=[pick]), \
                patch("atlas.results._find_final_game", side_effect=RuntimeError("boom")), \
                patch("atlas.results.db.mark_graded") as mock_mark:
            summary = results.run(now=datetime(2026, 8, 1, 23, 0, tzinfo=timezone.utc))

        self.assertEqual(len(summary["errors"]), 1)
        mock_mark.assert_not_called()


if __name__ == "__main__":
    unittest.main()
