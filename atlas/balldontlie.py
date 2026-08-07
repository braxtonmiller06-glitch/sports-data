"""Client for the BALLDONTLIE games feed, used by loadplays.py to resolve
each play's external_event_id and game start time.

UNVERIFIED, same caveat as fetchers/pybaseball_client.py: this was written
without a live API key or a chance to hit the real endpoints, so treat the
paths and response shape below as best-known-likely, not confirmed.
Specifically uncertain: whether BALLDONTLIE's free/all-star tier actually
covers WNBA and soccer (EPL/MLS/etc) the way it covers NBA/NFL/MLB -- verify
against your actual API key and their current docs before trusting this in
production. A wrong path/shape is a one-function fix here, not a redesign.
"""
import os
from datetime import date

import httpx

BASE_URL = "https://api.balldontlie.io"

# sport -> API path segment. VERIFY before relying on this -- see module docstring.
SPORT_PATHS = {
    "mlb": "mlb",
    "wnba": "wnba",
    "mls": "epl",  # placeholder: BALLDONTLIE's soccer coverage/path is unconfirmed
    "epl": "epl",
    "la_liga": "epl",
    "serie_a": "epl",
    "bundesliga": "epl",
    "ligue_1": "epl",
}


class BallDontLieError(Exception):
    pass


def _api_key() -> str:
    key = os.environ.get("BALLDONTLIE_API_KEY")
    if not key:
        raise BallDontLieError("BALLDONTLIE_API_KEY must be set")
    return key


def get_games_for_date(sport: str, game_date: date) -> list[dict]:
    """Return the day's games for a sport: [{id, start_time, home_team, away_team}, ...].

    `id` becomes external_event_id; `start_time` (ISO 8601, UTC) is what
    settles_at is computed from.
    """
    path = SPORT_PATHS.get(sport)
    if path is None:
        raise BallDontLieError(f"no BALLDONTLIE path mapping for sport '{sport}'")

    url = f"{BASE_URL}/{path}/v1/games"
    headers = {"Authorization": _api_key()}
    params = {"dates[]": game_date.isoformat()}

    response = httpx.get(url, headers=headers, params=params, timeout=10.0)
    if response.status_code != 200:
        raise BallDontLieError(f"BALLDONTLIE request failed: {response.status_code} {response.text[:200]}")

    payload = response.json()
    games = []
    for row in payload.get("data", []):
        games.append(
            {
                "id": str(row["id"]),
                "start_time": row.get("date") or row.get("start_time"),
                "home_team": (row.get("home_team") or {}).get("name") or row.get("home_team_name"),
                "away_team": (row.get("visitor_team") or row.get("away_team") or {}).get("name")
                or row.get("away_team_name"),
            }
        )
    return games


def find_game(games: list[dict], home_team: str, away_team: str) -> dict | None:
    """Exact (case-insensitive) team-name match against a day's games list."""
    for game in games:
        if (
            game["home_team"]
            and game["away_team"]
            and game["home_team"].lower() == home_team.lower()
            and game["away_team"].lower() == away_team.lower()
        ):
            return game
    return None
