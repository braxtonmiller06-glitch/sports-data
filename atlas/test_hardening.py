"""Regression tests for the atlas hardening pass.

Each test corresponds to a defect that existed in the code and fails against
the pre-fix version. Nothing here touches Supabase or the network: the two
db-writing tests monkeypatch atlas.db.
"""
from datetime import datetime, timedelta, timezone

import pytest

from atlas import closing_lines, loadplays, results
from atlas.closing_lines import UnpricedOdds, _match_odds_value, compute_clv_pct, find_picks_due


# ---------------------------------------------------------------------------
# compute_clv_pct: a zero or junk closing price used to divide by zero
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("closing", [0.0, -3.0, 1.0, 0.5])
def test_unusable_closing_price_is_rejected_not_divided_by(closing):
    with pytest.raises(UnpricedOdds):
        compute_clv_pct(2.0, closing)


@pytest.mark.parametrize("bet", [0.0, 1.0, -2.0])
def test_unusable_bet_price_is_rejected(bet):
    with pytest.raises(UnpricedOdds):
        compute_clv_pct(bet, 1.9)


@pytest.mark.parametrize("value", [float("nan"), float("inf")])
def test_non_finite_prices_are_rejected(value):
    with pytest.raises(UnpricedOdds):
        compute_clv_pct(2.0, value)
    with pytest.raises(UnpricedOdds):
        compute_clv_pct(value, 2.0)


def test_non_numeric_prices_are_rejected():
    with pytest.raises(UnpricedOdds):
        compute_clv_pct("2.0", 1.9)


def test_beating_the_close_is_positive_clv():
    assert compute_clv_pct(2.10, 1.90) > 0


def test_losing_to_the_close_is_negative_clv():
    assert compute_clv_pct(1.80, 1.90) < 0


def test_clv_magnitude():
    assert compute_clv_pct(2.0, 1.85) == pytest.approx(8.108, abs=0.01)


# ---------------------------------------------------------------------------
# _match_odds_value: substring matching pulled prices from the wrong market
# ---------------------------------------------------------------------------


def test_combined_label_does_not_satisfy_either_side():
    """"over" is a substring of "Under/Over 45.5", so an over selection used
    to match a label that prices neither side on its own."""
    labels = {"Under/Over 45.5": 1.91}
    assert _match_odds_value(labels, "over", "Fever", "Aces") is None
    assert _match_odds_value(labels, "under", "Fever", "Aces") is None


def test_draw_shorthand_x_does_not_match_arbitrary_words():
    """"x" was matched as a substring, so a draw selection matched almost any
    label it happened to see first."""
    assert _match_odds_value({"Boxer Max": 3.4}, "draw", "Fever", "Aces") is None
    assert _match_odds_value({"Phoenix Mercury": 3.4}, "draw", "Fever", "Aces") is None


def test_draw_still_matches_a_real_draw_label():
    assert _match_odds_value({"Draw": 3.40}, "draw", "Fever", "Aces") == 3.40
    assert _match_odds_value({"X": 3.40}, "draw", "Fever", "Aces") == 3.40
    assert _match_odds_value({"Tie": 3.40}, "draw", "Fever", "Aces") == 3.40


def test_over_and_under_resolve_to_their_own_prices():
    labels = {"Over 45.5": 1.87, "Under 45.5": 1.95}
    assert _match_odds_value(labels, "over", "Fever", "Aces") == 1.87
    assert _match_odds_value(labels, "under", "Fever", "Aces") == 1.95


def test_team_names_resolve_to_their_own_side():
    labels = {"Indiana Fever": 1.72, "Las Vegas Aces": 2.15}
    assert _match_odds_value(labels, "home", "Indiana Fever", "Las Vegas Aces") == 1.72
    assert _match_odds_value(labels, "away", "Indiana Fever", "Las Vegas Aces") == 2.15


def test_home_away_keywords_resolve():
    labels = {"Home": 1.72, "Away": 2.15}
    assert _match_odds_value(labels, "home", "Fever", "Aces") == 1.72
    assert _match_odds_value(labels, "away", "Fever", "Aces") == 2.15


@pytest.mark.parametrize("junk", [0, -1.5, -99, 1.0, 0.5, "n/a", None])
def test_a_non_price_is_not_returned_as_a_price(junk):
    # These used to come back as floats and then divide by zero or store a
    # fabricated CLV.
    assert _match_odds_value({"Over 45.5": junk}, "over", "Fever", "Aces") is None


# ---------------------------------------------------------------------------
# _to_decimal_odds: American prices used to reach the decimal CLV formula raw
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "raw, expected",
    [
        (-150, 1.6667),   # American favourite
        (-110, 1.9091),
        ("+130", 2.30),   # American underdog, with the sign as a string
        (100, 2.0),       # American even money
        (250, 3.50),
        (1.85, 1.85),     # already decimal, untouched
        ("2.05", 2.05),
        (1.01, 1.01),     # decimal longshot-favourite boundary
    ],
)
def test_prices_are_normalized_to_decimal_odds(raw, expected):
    assert closing_lines._to_decimal_odds(raw) == pytest.approx(expected, abs=0.001)


@pytest.mark.parametrize("bad", [0, 1.0, -1.5, -99, "n/a", None, float("nan")])
def test_unusable_prices_normalize_to_none(bad):
    assert closing_lines._to_decimal_odds(bad) is None


def test_a_normalized_american_price_produces_a_sane_clv():
    """The whole point of normalizing: -150 fed straight into compute_clv_pct
    gave (2.0 / -150 - 1) * 100 = -101%, a confident and completely wrong
    number that would have been stored as the pick's CLV."""
    closing = closing_lines._to_decimal_odds(-150)
    clv = compute_clv_pct(2.0, closing)
    assert 15 < clv < 25  # beating a 1.667 close with 2.0 is roughly +20%


def test_bare_1x2_labels_resolve_for_soccer():
    labels = {"1": 2.40, "X": 3.30, "2": 3.10}
    assert _match_odds_value(labels, "home", "Arsenal", "Chelsea") == 2.40
    assert _match_odds_value(labels, "draw", "Arsenal", "Chelsea") == 3.30
    assert _match_odds_value(labels, "away", "Arsenal", "Chelsea") == 3.10


def test_a_line_number_is_not_mistaken_for_a_1x2_side():
    """"1" as a whole label means home; "1" inside "Over 1.5" means a line."""
    assert _match_odds_value({"Over 1.5": 1.90}, "home", "Arsenal", "Chelsea") is None
    assert _match_odds_value({"Under 2.5": 1.90}, "away", "Arsenal", "Chelsea") is None


def test_empty_or_missing_odds_map():
    assert _match_odds_value(None, "over", "Fever", "Aces") is None
    assert _match_odds_value({}, "over", "Fever", "Aces") is None


def test_unknown_selection_side_matches_nothing():
    assert _match_odds_value({"Over 45.5": 1.9}, "sideways", "Fever", "Aces") is None


# ---------------------------------------------------------------------------
# find_picks_due: one bad row used to abort the whole cron run
# ---------------------------------------------------------------------------


def _pick(pick_id, sport, minutes_from_now, now):
    """A pick whose game starts `minutes_from_now`, expressed via settles_at."""
    buffer = loadplays.SETTLE_BUFFERS[loadplays._settle_bucket(sport)]
    start = now + timedelta(minutes=minutes_from_now)
    return {"id": pick_id, "sport": sport, "settles_at": (start + buffer).isoformat()}


def test_a_pick_inside_the_window_is_due():
    now = datetime.now(timezone.utc)
    due = find_picks_due([_pick(1, "wnba", 10, now)], now)
    assert [p["id"] for p in due] == [1]


def test_a_pick_outside_the_window_is_not_due():
    now = datetime.now(timezone.utc)
    picks = [_pick(1, "wnba", 90, now), _pick(2, "wnba", -30, now)]
    assert find_picks_due(picks, now) == []


def test_an_unconfigured_sport_is_skipped_not_fatal():
    """A KeyError here used to kill the run, and every other pick in the batch
    lost its one 15-minute closing window with it."""
    now = datetime.now(timezone.utc)
    picks = [
        {"id": 1, "sport": "nhl", "settles_at": now.isoformat()},
        _pick(2, "wnba", 10, now),
    ]
    assert [p["id"] for p in find_picks_due(picks, now)] == [2]


def test_an_unparseable_timestamp_is_skipped_not_fatal():
    now = datetime.now(timezone.utc)
    picks = [
        {"id": 1, "sport": "wnba", "settles_at": "not-a-date"},
        _pick(2, "wnba", 10, now),
    ]
    assert [p["id"] for p in find_picks_due(picks, now)] == [2]


def test_a_naive_settles_at_does_not_raise():
    """Postgres `timestamp` (no tz) comes back naive, and subtracting a naive
    from an aware datetime raises TypeError."""
    now = datetime.now(timezone.utc)
    buffer = loadplays.SETTLE_BUFFERS["wnba"]
    naive = (now + timedelta(minutes=10) + buffer).replace(tzinfo=None)
    due = find_picks_due([{"id": 1, "sport": "wnba", "settles_at": naive.isoformat()}], now)
    assert [p["id"] for p in due] == [1]


def test_a_naive_now_does_not_raise():
    now_aware = datetime.now(timezone.utc)
    due = find_picks_due([_pick(1, "wnba", 10, now_aware)], now_aware.replace(tzinfo=None))
    assert [p["id"] for p in due] == [1]


# ---------------------------------------------------------------------------
# loadplays: one failed insert used to abandon the rest of the card
# ---------------------------------------------------------------------------


def _play(subject, **overrides):
    play = {
        "sport": "wnba",
        "market_type": "moneyline",
        "subject": subject,
        "home_team": "Indiana Fever",
        "away_team": "Las Vegas Aces",
        "selection": "home",
        "decimal_odds": 1.85,
        "model_probability": 0.58,
        "market_probability": 0.54,
        "edge": 0.04,
        "confidence": 0.7,
        "verdict": "BET",
        "start_time": "2026-08-07T23:00:00Z",
    }
    play.update(overrides)
    return play


@pytest.fixture
def plays_file(tmp_path):
    import json

    def write(plays):
        path = tmp_path / "plays.json"
        path.write_text(json.dumps(plays))
        return str(path)

    return write


@pytest.fixture
def no_network(monkeypatch):
    """BALLDONTLIE returns nothing, so picks fall back to their start_time."""
    monkeypatch.setattr(loadplays.balldontlie, "get_games_for_date", lambda sport, d: [])


def test_a_failed_insert_does_not_abandon_the_rest_of_the_batch(
    monkeypatch, plays_file, no_network
):
    attempted = []

    def flaky_insert(row):
        attempted.append(row["subject"])
        if row["subject"] == "B":
            raise RuntimeError("connection reset")
        return row

    monkeypatch.setattr(loadplays.db, "insert_pick", flaky_insert)

    summary = loadplays.load_plays(plays_file([_play("A"), _play("B"), _play("C")]))

    assert attempted == ["A", "B", "C"], "the run stopped at the first failure"
    assert summary["inserted"] == 2
    assert len(summary["failed"]) == 1
    assert summary["failed"][0]["subject"] == "B"


def test_duplicate_plays_in_one_file_are_inserted_once(monkeypatch, plays_file, no_network):
    inserted = []
    monkeypatch.setattr(loadplays.db, "insert_pick", lambda row: inserted.append(row["subject"]))

    summary = loadplays.load_plays(plays_file([_play("A"), _play("A"), _play("B")]))

    assert inserted == ["A", "B"]
    assert summary["duplicates"] == 1


def test_the_same_market_on_a_different_line_is_not_a_duplicate():
    a = {"sport": "wnba", "home_team": "H", "away_team": "A", "market_type": "total",
         "subject": "Game", "selection_side": "over", "line": 165.5}
    b = dict(a, line=167.5)
    assert loadplays.pick_fingerprint(a) != loadplays.pick_fingerprint(b)


def test_odds_are_not_part_of_the_fingerprint():
    """A re-run after a line move is the same play, not a second one."""
    a = {"sport": "wnba", "home_team": "H", "away_team": "A", "market_type": "moneyline",
         "subject": "Game", "selection_side": "home", "line": None, "decimal_odds": 1.85}
    b = dict(a, decimal_odds=1.92, confidence=0.9)
    assert loadplays.pick_fingerprint(a) == loadplays.pick_fingerprint(b)


def test_a_malformed_entry_is_skipped_not_fatal(monkeypatch, plays_file, no_network):
    monkeypatch.setattr(loadplays.db, "insert_pick", lambda row: row)
    summary = loadplays.load_plays(plays_file([_play("A"), "not-a-dict", _play("B")]))
    assert summary["inserted"] == 2
    assert summary["skipped"] == 1


def test_a_non_list_file_is_a_clear_error(plays_file):
    with pytest.raises(ValueError, match="JSON list"):
        loadplays.load_plays(plays_file({"sport": "wnba"}))


# ---------------------------------------------------------------------------
# results: numerics arriving as strings used to raise mid-grade
# ---------------------------------------------------------------------------


FINAL = {"final_score": "88-80", "home_score": 88, "away_score": 80}


def test_a_spread_line_delivered_as_a_string_still_grades():
    assert results.grade_pick(FINAL, {"market_type": "spread", "selection_side": "home", "line": "-3.5"}) == "WIN"
    assert results.grade_pick(FINAL, {"market_type": "spread", "selection_side": "home", "line": "-10.5"}) == "LOSS"


def test_a_total_line_delivered_as_a_string_still_grades():
    assert results.grade_pick(FINAL, {"market_type": "total", "selection_side": "over", "line": "160.5"}) == "WIN"
    assert results.grade_pick(FINAL, {"market_type": "total", "selection_side": "under", "line": "160.5"}) == "LOSS"


def test_an_unparseable_line_is_ungradeable_not_a_crash():
    assert results.grade_pick(FINAL, {"market_type": "spread", "selection_side": "home", "line": "n/a"}) is None


def test_a_spread_with_a_total_side_is_not_graded_as_away():
    """"over" is not a side of a spread; grading it used to score it against
    the away team by falling through the home/away ternary."""
    assert results.grade_pick(FINAL, {"market_type": "spread", "selection_side": "over", "line": -3.5}) is None


def test_exact_spread_push():
    tie = {"final_score": "90-87", "home_score": 90, "away_score": 87}
    assert results.grade_pick(tie, {"market_type": "spread", "selection_side": "home", "line": -3.0}) == "PUSH"


def test_exact_total_push():
    assert results.grade_pick(FINAL, {"market_type": "total", "selection_side": "over", "line": 168}) == "PUSH"


def test_moneyline_grading_is_unchanged():
    assert results.grade_pick(FINAL, {"market_type": "moneyline", "selection_side": "home"}) == "WIN"
    assert results.grade_pick(FINAL, {"market_type": "moneyline", "selection_side": "away"}) == "LOSS"


def test_an_unfinished_game_is_not_graded():
    assert results.grade_pick({"final_score": None, "home_score": None, "away_score": None},
                              {"market_type": "moneyline", "selection_side": "home"}) is None


def test_caption_survives_string_numerics():
    """Both columns are Postgres numeric and can arrive as strings; the old
    arithmetic raised TypeError and took the Discord command down."""
    text = results.caption({"graded": [
        {"result": "WIN", "stake": "10", "decimal_odds": "2.10"},
        {"result": "LOSS", "stake": "10", "decimal_odds": "1.90"},
    ]})
    assert "1-1" in text
    assert "+1.00" in text


def test_caption_ignores_unstaked_picks():
    text = results.caption({"graded": [
        {"result": "WIN", "stake": None, "decimal_odds": 2.0},
        {"result": "WIN", "stake": 10, "decimal_odds": 2.0},
    ]})
    assert "2-0" in text
    assert "+10.00" in text


def test_caption_with_nothing_graded():
    assert "No picks graded" in results.caption({"graded": []})


def test_pushes_are_excluded_from_the_win_percentage():
    text = results.caption({"graded": [
        {"result": "WIN", "stake": 10, "decimal_odds": 2.0},
        {"result": "PUSH", "stake": 10, "decimal_odds": 2.0},
    ]})
    assert "1-0-1" in text
    assert "100.0%" in text
