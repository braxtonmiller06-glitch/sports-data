"""atlas/loadplays.py -- takes the day's plays and inserts them into
Supabase via db.insert_pick.

INPUT FORMAT (my own design -- no existing "plays" shape was specified):
a JSON file containing a list of play dicts:

{
  "sport": "mlb" | "wnba" | "epl" | "la_liga" | "serie_a" | "bundesliga" | "ligue_1" | "mls",
  "market_type": "moneyline" | "total" | "player_points_over" | ...,
  "subject": "Team A" | "Player Name",
  "home_team": "Team A", "away_team": "Team B",
  "selection": "Team A" | "home" | "away" | "over" | "under" | "draw",
  "line": float | null,
  "decimal_odds": float,
  "model_probability": float, "market_probability": float, "edge": float,
  "confidence": float,
  "verdict": "PASS" | "LEAN" | "PLAYABLE" | "BET",
  "stake": float | null,
  "start_time": "2026-08-01T18:10:00Z"   # fallback only if BALLDONTLIE has no match
}

Usage: python -m atlas.loadplays plays_2026-08-01.json
"""
import json
import sys
from datetime import date, datetime, timedelta

from atlas import balldontlie, db
from backend.engine.filters.registry import SOCCER_LEAGUE_SPORTS

# Buffer added to game start time to get settles_at. Tune here.
SETTLE_BUFFERS: dict[str, timedelta] = {
    "soccer": timedelta(hours=2.5),
    "mlb": timedelta(hours=4),
    "wnba": timedelta(hours=2.5),
}

TWO_WAY_SIDES = {"home", "away", "over", "under"}
THREE_WAY_SIDES = {"home", "draw", "away"}
VALID_VERDICTS = {"PASS", "LEAN", "PLAYABLE", "BET"}
VALID_RESULTS = {"WIN", "LOSS", "PUSH"}
_THREE_WAY_MARKET_TYPES = {"moneyline", "1x2"}

REQUIRED_FIELDS = [
    "sport", "market_type", "subject", "selection_side", "three_way",
    "decimal_odds", "model_probability", "market_probability", "edge",
    "confidence", "verdict", "settles_at",
]


class PickValidationError(Exception):
    def __init__(self, field: str, reason: str):
        self.field = field
        self.reason = reason
        super().__init__(f"{field}: {reason}")


def _settle_bucket(sport: str) -> str:
    return "soccer" if sport in SOCCER_LEAGUE_SPORTS else sport


def compute_settles_at(sport: str, start_time: datetime) -> datetime:
    bucket = _settle_bucket(sport)
    if bucket not in SETTLE_BUFFERS:
        raise ValueError(f"no settlement buffer configured for sport '{sport}' (bucket '{bucket}')")
    return start_time + SETTLE_BUFFERS[bucket]


def is_three_way(sport: str, market_type: str) -> bool:
    return sport in SOCCER_LEAGUE_SPORTS and market_type.lower() in _THREE_WAY_MARKET_TYPES


def resolve_selection_side(selection: str, game: dict | None) -> str:
    """Normalize a play's raw `selection` (a team name, or a literal
    over/under/draw/home/away) into the picks table's selection_side vocabulary.
    """
    normalized = selection.strip().lower()
    if normalized in ("over", "under", "draw", "home", "away"):
        return normalized
    if game:
        if selection.lower() == (game.get("home_team") or "").lower():
            return "home"
        if selection.lower() == (game.get("away_team") or "").lower():
            return "away"
    raise ValueError(f"cannot resolve selection_side from selection={selection!r} without a matched game")


def validate_pick(pick: dict) -> None:
    """Mirrors atlas/schema.sql's check constraints exactly -- keep in sync."""
    for field in REQUIRED_FIELDS:
        if pick.get(field) is None:
            raise PickValidationError(field, "missing/null but required by the picks table schema")

    three_way = pick["three_way"]
    side = pick["selection_side"]
    if three_way and side not in THREE_WAY_SIDES:
        raise PickValidationError("selection_side", f"must be one of {sorted(THREE_WAY_SIDES)} when three_way=True")
    if not three_way and side not in TWO_WAY_SIDES:
        raise PickValidationError("selection_side", f"must be one of {sorted(TWO_WAY_SIDES)} when three_way=False")

    if pick["decimal_odds"] <= 1.0:
        raise PickValidationError("decimal_odds", "must be > 1.0")
    if not (0.0 <= pick["model_probability"] <= 1.0):
        raise PickValidationError("model_probability", "must be between 0.0 and 1.0")
    if not (0.0 <= pick["market_probability"] <= 1.0):
        raise PickValidationError("market_probability", "must be between 0.0 and 1.0")
    if pick["verdict"] not in VALID_VERDICTS:
        raise PickValidationError("verdict", f"must be one of {sorted(VALID_VERDICTS)}")
    result = pick.get("result")
    if result is not None and result not in VALID_RESULTS:
        raise PickValidationError("result", f"must be null or one of {sorted(VALID_RESULTS)}")


def _parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def build_pick_row(play: dict, games_by_sport: dict[str, list[dict]]) -> dict:
    sport = play["sport"]
    games = games_by_sport.get(sport, [])
    game = balldontlie.find_game(games, play["home_team"], play["away_team"])

    external_event_id = game["id"] if game else None
    if external_event_id is None:
        print(
            f"WARNING: no BALLDONTLIE match for {play['home_team']} vs {play['away_team']} ({sport}) -- "
            "external_event_id will be null, grading falls back to fuzzy team-name matching"
        )

    if game and game.get("start_time"):
        start_time = _parse_iso(game["start_time"])
    elif play.get("start_time"):
        start_time = _parse_iso(play["start_time"])
    else:
        raise ValueError(f"no game start time available for {play['home_team']} vs {play['away_team']}")

    three_way = is_three_way(sport, play["market_type"])
    selection_side = resolve_selection_side(play["selection"], game)

    return {
        "sport": sport,
        "market_type": play["market_type"],
        "subject": play["subject"],
        "external_event_id": external_event_id,
        "line": play.get("line"),
        "selection_side": selection_side,
        "three_way": three_way,
        "decimal_odds": play["decimal_odds"],
        "model_probability": play["model_probability"],
        "market_probability": play["market_probability"],
        "edge": play["edge"],
        "confidence": play["confidence"],
        "verdict": play["verdict"],
        "stake": play.get("stake"),
        "settles_at": compute_settles_at(sport, start_time).isoformat(),
    }


def load_plays(plays_path: str, game_date: date | None = None) -> None:
    game_date = game_date or date.today()
    with open(plays_path) as f:
        plays = json.load(f)

    sports = {p["sport"] for p in plays}
    games_by_sport: dict[str, list[dict]] = {}
    for sport in sports:
        try:
            games_by_sport[sport] = balldontlie.get_games_for_date(sport, game_date)
        except balldontlie.BallDontLieError as exc:
            print(f"WARNING: could not fetch BALLDONTLIE games for '{sport}': {exc}")
            games_by_sport[sport] = []

    inserted, skipped = 0, 0
    for play in plays:
        try:
            row = build_pick_row(play, games_by_sport)
            validate_pick(row)
        except PickValidationError as exc:
            print(f"SKIPPING pick ({play.get('subject', '?')}): invalid {exc.field} -- {exc.reason}")
            skipped += 1
            continue
        except (ValueError, KeyError) as exc:
            print(f"SKIPPING pick ({play.get('subject', '?')}): {exc}")
            skipped += 1
            continue

        db.insert_pick(row)
        inserted += 1

    print(f"Done: {inserted} inserted, {skipped} skipped")


if __name__ == "__main__":
    load_plays(sys.argv[1])
