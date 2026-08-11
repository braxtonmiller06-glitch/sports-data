"""BALLDONTLIE client.

Covers the whole product rather than the single games call `atlas/balldontlie.py`
makes, and replaces the guesswork in that module with something checkable: the
endpoint surface is declared as data below, and `scripts/probe_balldontlie.py`
hits every entry with a real key and reports what actually answered.

Why that matters here. BALLDONTLIE's league prefixes are not uniform -- NBA is
served from `/v1`, every other league from `/<league>/v1` -- and which endpoints
a key may call depends on the paid tier, not just on the league. Both facts are
easy to get wrong from memory and impossible to verify from this sandbox, which
has no egress to api.balldontlie.io. So nothing here is asserted as true: the
registry is a hypothesis, `probe` is the experiment, and `VERIFIED` records the
answer once it has been run.

Correcting a wrong path is a one-line edit to the registry, never a change to
calling code.
"""
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Optional

import httpx

log = logging.getLogger(__name__)

BASE_URL = os.getenv("BALLDONTLIE_BASE_URL", "https://api.balldontlie.io")

# league -> path prefix. NBA is deliberately the odd one out; it predates the
# multi-sport expansion and was never moved under a league segment.
LEAGUE_PREFIX: dict[str, str] = {
    "nba": "/v1",
    "wnba": "/wnba/v1",
    "mlb": "/mlb/v1",
    "nfl": "/nfl/v1",
    "epl": "/epl/v1",
}

# Requests per minute by plan. The client self-throttles to this so a burst
# fails slowly rather than collecting 429s.
TIER_RATE_LIMITS: dict[str, int] = {
    "free": 5,
    "all-star": 60,
    "goat": 600,
}

ACTIVE_TIER = os.getenv("BALLDONTLIE_TIER", "free").lower()


@dataclass(frozen=True)
class Endpoint:
    """One callable resource.

    `min_tier` is what this endpoint is *believed* to require. The probe
    replaces belief with the response your key actually gets.
    """

    name: str
    path: str
    min_tier: str = "free"
    params: tuple[str, ...] = field(default_factory=tuple)
    note: str = ""


_COMMON = (
    Endpoint("teams", "/teams", "free", ("division", "conference")),
    Endpoint("players", "/players", "free", ("search", "team_ids[]", "per_page", "cursor")),
    Endpoint("games", "/games", "free", ("dates[]", "seasons[]", "team_ids[]", "per_page", "cursor")),
    Endpoint("standings", "/standings", "all-star", ("season",)),
    Endpoint("player_injuries", "/player_injuries", "goat", ("team_ids[]", "player_ids[]")),
)

# Per league, because coverage genuinely differs. Anything marked UNCONFIRMED
# is a path this module has never seen answer.
ENDPOINTS: dict[str, tuple[Endpoint, ...]] = {
    "nba": _COMMON
    + (
        Endpoint("active_players", "/players/active", "all-star", ("search", "per_page", "cursor")),
        Endpoint("stats", "/stats", "all-star", ("dates[]", "seasons[]", "player_ids[]", "game_ids[]")),
        Endpoint("season_averages", "/season_averages", "all-star", ("season", "player_ids[]")),
        Endpoint("box_scores", "/box_scores", "goat", ("date",)),
        Endpoint("live_box_scores", "/box_scores/live", "goat", ()),
        Endpoint("odds", "/odds", "goat", ("date", "game_id")),
        Endpoint("leaders", "/leaders", "all-star", ("season", "stat_type")),
    ),
    "wnba": _COMMON
    + (
        Endpoint("stats", "/stats", "all-star", ("dates[]", "seasons[]", "player_ids[]")),
        Endpoint("season_averages", "/season_averages", "all-star", ("season", "player_ids[]")),
        Endpoint("box_scores", "/box_scores", "goat", ("date",)),
    ),
    "mlb": _COMMON
    + (
        Endpoint("stats", "/stats", "all-star", ("dates[]", "seasons[]", "player_ids[]")),
        Endpoint("season_stats", "/season_stats", "all-star", ("season", "player_ids[]")),
        Endpoint("team_season_stats", "/team_season_stats", "all-star", ("season", "team_id")),
    ),
    "nfl": _COMMON
    + (
        Endpoint("stats", "/stats", "all-star", ("seasons[]", "player_ids[]", "game_ids[]")),
        Endpoint("season_stats", "/season_stats", "all-star", ("season", "player_ids[]")),
        Endpoint("advanced_stats", "/advanced_stats", "goat", ("season", "player_ids[]")),
    ),
    "epl": _COMMON
    + (
        Endpoint("player_stats", "/player_stats", "all-star", ("season", "player_ids[]")),
        Endpoint("team_stats", "/team_stats", "all-star", ("season", "team_ids[]")),
        Endpoint("leaders", "/leaders", "all-star", ("season", "stat_type")),
    ),
}

# Filled in from a probe run. Empty means "nobody has checked yet", which is a
# different and more honest state than "believed to work".
VERIFIED: dict[str, dict[str, bool]] = {}


class BallDontLieError(Exception):
    """Any non-success from BALLDONTLIE, with the status kept for callers."""

    def __init__(self, message: str, status_code: Optional[int] = None):
        self.status_code = status_code
        super().__init__(message)


class BallDontLieAuthError(BallDontLieError):
    """401/403 -- bad key, or an endpoint above this key's tier."""


class BallDontLieRateLimited(BallDontLieError):
    """429 -- too many requests for the plan."""


def api_key() -> str:
    key = os.environ.get("BALLDONTLIE_API_KEY")
    if not key:
        raise BallDontLieError("BALLDONTLIE_API_KEY must be set")
    return key


class _Throttle:
    """Spaces requests to stay under the plan's per-minute allowance.

    Client-side and per-process, so it is a courtesy rather than a guarantee --
    it stops this process stampeding, not a fleet of them. The 429 handling
    below is what actually has to be correct.
    """

    def __init__(self, per_minute: int):
        self._min_interval = 60.0 / per_minute if per_minute > 0 else 0.0
        self._last = 0.0

    def wait(self) -> None:
        if self._min_interval <= 0:
            return
        elapsed = time.monotonic() - self._last
        if elapsed < self._min_interval:
            time.sleep(self._min_interval - elapsed)
        self._last = time.monotonic()


_throttle = _Throttle(TIER_RATE_LIMITS.get(ACTIVE_TIER, 5))

_MAX_ATTEMPTS = 3


def url_for(league: str, path: str) -> str:
    prefix = LEAGUE_PREFIX.get(league)
    if prefix is None:
        raise BallDontLieError(f"no BALLDONTLIE prefix for league '{league}'")
    return f"{BASE_URL}{prefix}{path}"


def endpoint(league: str, name: str) -> Endpoint:
    for candidate in ENDPOINTS.get(league, ()):
        if candidate.name == name:
            return candidate
    raise BallDontLieError(f"no endpoint '{name}' registered for league '{league}'")


def request(
    league: str,
    path: str,
    params: Optional[dict[str, Any]] = None,
    *,
    timeout: float = 15.0,
) -> dict:
    """One GET, with throttling, retry and typed failures.

    Retries only what is worth retrying: a timeout, a transport error, a 5xx,
    or a 429 that told us how long to wait. A 401/403 is a configuration fact
    and retrying it just spends quota confirming it.
    """
    target = url_for(league, path)
    headers = {"Authorization": api_key()}

    last_error: Optional[Exception] = None

    for attempt in range(_MAX_ATTEMPTS):
        _throttle.wait()
        try:
            response = httpx.get(target, headers=headers, params=params or {}, timeout=timeout)
        except httpx.RequestError as exc:
            last_error = exc
            log.warning("balldontlie transport error on %s (attempt %d): %s", target, attempt + 1, exc)
            time.sleep(2**attempt)
            continue

        if response.status_code == 200:
            try:
                return response.json()
            except ValueError as exc:
                # A 200 carrying HTML is a proxy or an outage page, not data.
                raise BallDontLieError(
                    f"BALLDONTLIE returned non-JSON from {path}: {response.text[:120]}",
                    status_code=200,
                ) from exc

        if response.status_code in (401, 403):
            raise BallDontLieAuthError(
                f"BALLDONTLIE denied {league}{path} ({response.status_code}). "
                "Either the key is wrong or this endpoint is above your plan.",
                status_code=response.status_code,
            )

        if response.status_code == 429:
            retry_after = float(response.headers.get("Retry-After", 2**attempt))
            if attempt == _MAX_ATTEMPTS - 1:
                raise BallDontLieRateLimited(
                    f"BALLDONTLIE rate limit hit on {league}{path}", status_code=429
                )
            log.warning("balldontlie 429 on %s; sleeping %.1fs", target, retry_after)
            time.sleep(retry_after)
            continue

        if 500 <= response.status_code < 600:
            last_error = BallDontLieError(
                f"BALLDONTLIE {response.status_code} on {path}", status_code=response.status_code
            )
            if attempt < _MAX_ATTEMPTS - 1:
                time.sleep(2**attempt)
                continue

        raise BallDontLieError(
            f"BALLDONTLIE request failed: {response.status_code} {response.text[:200]}",
            status_code=response.status_code,
        )

    raise BallDontLieError(f"BALLDONTLIE unreachable after {_MAX_ATTEMPTS} attempts: {last_error}")


def fetch(league: str, name: str, params: Optional[dict[str, Any]] = None) -> dict:
    """Call a registered endpoint by name."""
    return request(league, endpoint(league, name).path, params)


def paginate(league: str, name: str, params: Optional[dict[str, Any]] = None, *, max_pages: int = 10):
    """Follow BALLDONTLIE's cursor pagination, bounded.

    `max_pages` exists because an unbounded loop over a paid, rate-limited API
    is how a single bad filter spends a plan's daily allowance.
    """
    query = dict(params or {})
    for _ in range(max_pages):
        payload = fetch(league, name, query)
        rows = payload.get("data", [])
        if not rows:
            return
        yield from rows

        cursor = (payload.get("meta") or {}).get("next_cursor")
        if not cursor:
            return
        query["cursor"] = cursor

    log.warning("balldontlie pagination stopped at max_pages=%d for %s/%s", max_pages, league, name)
