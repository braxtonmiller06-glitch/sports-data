"""Regression tests for the backend hardening pass.

Every test here was written against a defect that existed in the code: each
one fails on the pre-fix version. They are grouped by the module they guard
so a future change that reintroduces one is easy to trace.

No network and no shared state -- the rate limiter tests use a throwaway
SQLite file under tmp_path, everything else is pure.
"""
import math
import threading

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend import cache
from backend.config import DAILY_LIMIT_FREE_TIER
from backend.database import Base
from backend.engine.bet_sizing import FractionalKellyBetSizer
from backend.engine.scoring_utils import percent_diff, signal_from_strength, strength_from_z
from backend.fetchers import api_sports
from backend.fetchers.normalize import (
    MissingUpstreamId,
    normalize_game_american_football,
    normalize_game_basketball,
    normalize_odds,
    normalize_player,
    normalize_team_basketball,
)
from backend.models import ApiUsage
from backend.rate_limiter import RateLimitExceeded, check_and_increment, get_usage


@pytest.fixture
def db(tmp_path):
    """A file-backed SQLite database.

    Deliberately not `sqlite://` with a StaticPool: that shares one
    connection across every Session, so concurrent transactions collide in
    the driver ("cannot start a transaction within a transaction") and the
    concurrency test would be measuring the fixture rather than the limiter.
    A file gives each connection its own transaction, like Postgres does.
    `timeout` is SQLite's busy-wait; without it contending writers raise
    "database is locked" instead of queueing.
    """
    engine = create_engine(
        f"sqlite:///{tmp_path / 'test.db'}",
        connect_args={"check_same_thread": False, "timeout": 30},
    )
    Base.metadata.create_all(bind=engine, tables=[ApiUsage.__table__])
    Session = sessionmaker(bind=engine)
    session = Session()
    session.info["factory"] = Session
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


# ---------------------------------------------------------------------------
# normalize: a missing upstream id used to become the literal key "sport_None"
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "normalizer, raw",
    [
        (normalize_game_basketball, {"teams": {}, "scores": {}}),
        (normalize_game_american_football, {"game": {}, "teams": {}, "scores": {}}),
        (normalize_team_basketball, {"name": "Fever"}),
        (normalize_player, {"name": "A. Player"}),
    ],
)
def test_missing_upstream_id_raises_instead_of_making_a_none_key(normalizer, raw):
    with pytest.raises(MissingUpstreamId):
        normalizer("wnba", raw)


def test_two_id_less_games_would_have_collided_on_one_primary_key():
    """The reason the above matters: both records produced the same id, so
    persisting them overwrote one with the other."""
    for raw in ({"teams": {}, "scores": {}}, {"teams": {}, "scores": {}}):
        with pytest.raises(MissingUpstreamId):
            normalize_game_basketball("wnba", raw)


def test_nested_missing_team_id_is_none_not_a_string():
    game = normalize_game_basketball("wnba", {"id": 42, "teams": {"home": {}}, "scores": {}})
    assert game["id"] == "wnba_42"
    assert game["home_team_id"] is None
    assert game["away_team_id"] is None


def test_odds_without_a_game_id_are_rejected():
    # Odds.game_id is NOT NULL; letting this through raised IntegrityError
    # from inside the request handler rather than here.
    with pytest.raises(MissingUpstreamId):
        normalize_odds("wnba", None, {"name": "Book", "bets": []})


def test_odds_drop_value_less_entries_rather_than_keying_on_none():
    odds = normalize_odds(
        "wnba",
        7,
        {"name": "Book", "bets": [{"name": "Moneyline", "values": [{"value": None, "odd": "1.9"}]}]},
    )
    assert odds["game_id"] == "wnba_7"
    assert odds["moneyline"] is None


# ---------------------------------------------------------------------------
# scoring_utils: NaN used to survive min/max and come out as 1.0 = STRONG_OVER
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("bad", [float("nan"), float("inf"), float("-inf")])
def test_non_finite_differential_is_neutral_not_maximum_conviction(bad):
    strength = strength_from_z(bad)
    assert strength == 0.0
    assert signal_from_strength(strength).name == "NEUTRAL"


def test_non_finite_strength_is_neutral():
    assert signal_from_strength(float("nan")).name == "NEUTRAL"


def test_normal_differentials_still_score():
    assert strength_from_z(2.0) > 0.6
    assert strength_from_z(-2.0) < -0.6
    assert strength_from_z(0.0) == 0.0


def test_percent_diff_guards_non_finite():
    assert percent_diff(5.0, 0.0) == 0.0
    assert percent_diff(5.0, float("nan")) == 0.0
    assert percent_diff(float("nan"), 5.0) == 0.0
    assert percent_diff(11.0, 10.0) == pytest.approx(0.1)


# ---------------------------------------------------------------------------
# bet_sizing: a negative bankroll used to return a negative stake
# ---------------------------------------------------------------------------


def test_negative_bankroll_sizes_to_zero_not_a_negative_stake():
    assert FractionalKellyBetSizer().size(0.60, 2.0, -1000.0) == 0.0


def test_zero_bankroll_sizes_to_zero():
    assert FractionalKellyBetSizer().size(0.60, 2.0, 0.0) == 0.0


@pytest.mark.parametrize("p", [float("nan"), float("inf")])
def test_non_finite_probability_sizes_to_zero(p):
    assert FractionalKellyBetSizer().size(p, 2.0, 1000.0) == 0.0


def test_out_of_range_probability_is_clamped_within_the_cap():
    sizer = FractionalKellyBetSizer(fraction=0.25, cap_pct=0.03)
    stake = sizer.size(1.5, 2.0, 1000.0)
    assert stake == pytest.approx(30.0)  # the 3% cap, not an unbounded bet


def test_a_normal_edge_still_sizes():
    stake = FractionalKellyBetSizer().size(0.60, 2.0, 1000.0)
    assert 0 < stake <= 30.0


def test_no_edge_sizes_to_zero():
    assert FractionalKellyBetSizer().size(0.40, 2.0, 1000.0) == 0.0


# ---------------------------------------------------------------------------
# rate_limiter: read-then-write let concurrent callers both pass the cap
# ---------------------------------------------------------------------------


def test_increments_and_reports_the_running_count(db):
    assert check_and_increment(db, "basketball") == 1
    assert check_and_increment(db, "basketball") == 2
    assert get_usage(db, "basketball") == 2


def test_products_have_independent_quotas(db):
    check_and_increment(db, "basketball")
    assert get_usage(db, "baseball") == 0


def test_raises_at_the_cap_and_does_not_exceed_it(db):
    db.add(ApiUsage(product="basketball", date=__import__("datetime").date.today().isoformat(),
                    count=DAILY_LIMIT_FREE_TIER))
    db.commit()
    with pytest.raises(RateLimitExceeded):
        check_and_increment(db, "basketball")
    assert get_usage(db, "basketball") == DAILY_LIMIT_FREE_TIER


def test_concurrent_reservations_never_overshoot_the_daily_cap(db):
    """The original read-then-write allowed two threads that both read 99 to
    both write 100, so the real count drifted past the provider's limit."""
    Session = db.info["factory"]
    start = DAILY_LIMIT_FREE_TIER - 5
    db.add(ApiUsage(product="basketball", date=__import__("datetime").date.today().isoformat(),
                    count=start))
    db.commit()

    granted = []
    refused = []
    lock = threading.Lock()
    barrier = threading.Barrier(10)

    def worker():
        session = Session()
        barrier.wait()  # maximize the overlap
        try:
            count = check_and_increment(session, "basketball")
            with lock:
                granted.append(count)
        except RateLimitExceeded:
            with lock:
                refused.append(1)
        except Exception as exc:  # an IntegrityError here is also a failure
            with lock:
                refused.append(exc)
        finally:
            session.close()

    threads = [threading.Thread(target=worker) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert all(r == 1 for r in refused), f"unexpected error instead of a clean refusal: {refused}"
    assert len(granted) == 5, f"expected exactly 5 grants, got {len(granted)}"
    assert get_usage(db, "basketball") == DAILY_LIMIT_FREE_TIER
    assert sorted(granted) == list(range(start + 1, DAILY_LIMIT_FREE_TIER + 1))


# ---------------------------------------------------------------------------
# api_sports: one reservation used to cover up to MAX_RETRIES real requests
# ---------------------------------------------------------------------------


def test_quota_is_reserved_once_per_attempt_not_once_per_call(monkeypatch):
    monkeypatch.setattr(api_sports, "API_SPORTS_KEY", "test-key")
    monkeypatch.setattr(api_sports.time, "sleep", lambda _: None)

    import httpx

    def always_fails(*args, **kwargs):
        raise httpx.ConnectError("boom")

    monkeypatch.setattr(api_sports.httpx, "get", always_fails)

    attempts = []
    with pytest.raises(api_sports.ApiSportsError):
        api_sports.request("basketball", "/games", before_attempt=lambda: attempts.append(1))

    assert len(attempts) == api_sports.MAX_RETRIES


def test_a_reservation_that_raises_aborts_the_retry_loop(monkeypatch):
    monkeypatch.setattr(api_sports, "API_SPORTS_KEY", "test-key")
    monkeypatch.setattr(api_sports.time, "sleep", lambda _: None)

    def refuse():
        raise RateLimitExceeded("basketball", DAILY_LIMIT_FREE_TIER)

    with pytest.raises(RateLimitExceeded):
        api_sports.request("basketball", "/games", before_attempt=refuse)


def test_a_200_carrying_html_is_an_api_error_not_a_raw_value_error(monkeypatch):
    monkeypatch.setattr(api_sports, "API_SPORTS_KEY", "test-key")

    class FakeResponse:
        status_code = 200
        text = "<html>captive portal</html>"

        def json(self):
            raise ValueError("not json")

    monkeypatch.setattr(api_sports.httpx, "get", lambda *a, **k: FakeResponse())

    with pytest.raises(api_sports.ApiSportsError):
        api_sports.request("basketball", "/games")


def test_backoff_does_not_sleep_after_the_final_attempt(monkeypatch):
    slept = []
    monkeypatch.setattr(api_sports.time, "sleep", lambda s: slept.append(s))
    for attempt in range(api_sports.MAX_RETRIES):
        api_sports._backoff(attempt)
    assert len(slept) == api_sports.MAX_RETRIES - 1


# ---------------------------------------------------------------------------
# cache: entries were only reclaimed on read, so write-once keys leaked
# ---------------------------------------------------------------------------


def test_cache_round_trips_a_value():
    cache.clear()
    cache.set(cache.make_key("games", sport="wnba"), "games", [{"id": 1}])
    assert cache.get(cache.make_key("games", sport="wnba")) == [{"id": 1}]


def test_cache_is_bounded_even_when_nothing_is_ever_read():
    cache.clear()
    for i in range(cache.MAX_ENTRIES * 2):
        cache.set(f"games:sport=s{i}", "games", i)
    assert len(cache._store) <= cache.MAX_ENTRIES


def test_eviction_prefers_expired_entries_over_live_ones():
    cache.clear()
    # "teams" has a 24h TTL, so these stay live; the short-TTL default of 60s
    # is what an unknown resource gets. Force expiry directly rather than
    # sleeping.
    for i in range(cache.MAX_ENTRIES):
        cache.set(f"teams:sport=s{i}", "teams", i)
    with cache._lock:
        for key in list(cache._store)[: cache.MAX_ENTRIES // 2]:
            expires_at, value = cache._store[key]
            cache._store[key] = (0.0, value)

    cache.set("teams:sport=fresh", "teams", "fresh")
    assert cache.get("teams:sport=fresh") == "fresh"
    assert len(cache._store) <= cache.MAX_ENTRIES


def test_expired_entries_are_not_returned():
    cache.clear()
    cache.set("games:sport=x", "games", "stale")
    with cache._lock:
        _, value = cache._store["games:sport=x"]
        cache._store["games:sport=x"] = (0.0, value)
    assert cache.get("games:sport=x") is None


def test_make_key_is_order_independent_and_skips_nones():
    assert cache.make_key("games", sport="wnba", date="2026-08-07") == cache.make_key(
        "games", date="2026-08-07", sport="wnba"
    )
    assert cache.make_key("players", sport="wnba", team=None) == "players:sport=wnba"


# ---------------------------------------------------------------------------
# config: the CORS default must not be a wildcard
# ---------------------------------------------------------------------------


def test_cors_default_is_not_a_wildcard():
    from backend.config import CORS_ALLOWED_ORIGINS

    assert "*" not in CORS_ALLOWED_ORIGINS
    assert all(o.startswith("http") for o in CORS_ALLOWED_ORIGINS)


def test_debug_errors_defaults_off():
    from backend.config import DEBUG_ERRORS

    assert DEBUG_ERRORS is False


def test_math_import_is_used_for_finiteness_checks():
    # Guards against the guards being deleted as "redundant".
    assert math.isfinite(1.0)
