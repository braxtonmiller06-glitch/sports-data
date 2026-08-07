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
    "sport", "market_type", "subject", "home_team", "away_team", "selection_side", "three_way",
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
        "home_team": play["home_team"],
        "away_team": play["away_team"],
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


def pick_fingerprint(row: dict) -> str:
    """Identity of a pick for de-duplication.

    A play is the same play if it's the same side of the same market on the
    same fixture. Odds and confidence are deliberately excluded: a re-run
    after a line move is still the same play, and inserting it twice would
    double-count it in the record and the P/L.
    """
    return "|".join(
        str(row.get(field, "")).strip().lower()
        for field in ("sport", "home_team", "away_team", "market_type", "subject", "selection_side", "line")
    )


def load_plays(plays_path: str, game_date: date | None = None) -> dict:
    game_date = game_date or date.today()
    with open(plays_path) as f:
        plays = json.load(f)

    if not isinstance(plays, list):
        raise ValueError(f"{plays_path} must contain a JSON list of plays, got {type(plays).__name__}")

    sports = {p["sport"] for p in plays if isinstance(p, dict) and p.get("sport")}
    games_by_sport: dict[str, list[dict]] = {}
    for sport in sports:
        try:
            games_by_sport[sport] = balldontlie.get_games_for_date(sport, game_date)
        except balldontlie.BallDontLieError as exc:
            print(f"WARNING: could not fetch BALLDONTLIE games for '{sport}': {exc}")
            games_by_sport[sport] = []

    inserted, skipped, duplicates = 0, 0, 0
    failed: list[dict] = []
    seen: set[str] = set()

    for play in plays:
        if not isinstance(play, dict):
            print(f"SKIPPING entry: expected an object, got {type(play).__name__}")
            skipped += 1
            continue
        try:
            row = build_pick_row(play, games_by_sport)
            validate_pick(row)
        except PickValidationError as exc:
            print(f"SKIPPING pick ({play.get('subject', '?')}): invalid {exc.field} -- {exc.reason}")
            skipped += 1
            continue
        except (ValueError, KeyError, TypeError) as exc:
            print(f"SKIPPING pick ({play.get('subject', '?')}): {exc}")
            skipped += 1
            continue

        # Guards against the same file being loaded twice, and against a file
        # that lists the same play more than once. This is only within-run --
        # a cross-run guard needs a unique index in Postgres, see schema.sql.
        fingerprint = pick_fingerprint(row)
        if fingerprint in seen:
            print(f"SKIPPING duplicate pick in this file: {row['subject']} ({row['market_type']})")
            duplicates += 1
            continue
        seen.add(fingerprint)

        try:
            db.insert_pick(row)
        except Exception as exc:
            # An insert failure used to abort the run, so a single network
            # blip on play 3 of 12 silently lost the other nine. Record it
            # and keep going; the summary is what the caller checks.
            print(f"FAILED to insert pick ({row['subject']}): {exc}")
            failed.append({"subject": row["subject"], "error": str(exc)})
            continue
        inserted += 1

    summary = {
        "inserted": inserted,
        "skipped": skipped,
        "duplicates": duplicates,
        "failed": failed,
    }
    print(
        f"Done: {inserted} inserted, {skipped} skipped, "
        f"{duplicates} in-file duplicates, {len(failed)} failed"
    )
    return summary


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: python -m atlas.loadplays <plays.json>", file=sys.stderr)
        raise SystemExit(2)
    result = load_plays(sys.argv[1])
    # Non-zero exit so a cron wrapper notices failed inserts instead of
    # treating a run that dropped half the card as a success.
    raise SystemExit(1 if result["failed"] else 0)
