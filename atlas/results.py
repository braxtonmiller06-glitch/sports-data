"""atlas/results.py -- grades settled picks and produces a results caption.
Called by the Discord bot's /runresults command (atlas/bot.py), but is
plain, network-touching Python with no Discord dependency itself.

GRADING SCOPE (my own design, same restriction as closing_lines.py and for
the same reason): only game-level markets (moneyline/1x2, spread, total)
are graded, using final scores from API-Sports via backend/fetchers.
Player-prop picks need per-game player box scores, and no fetcher returns
those yet (interface.get_players only gives season aggregates) -- prop
picks are skipped with a clear reason, never guessed at.

SPREAD LINE CONVENTION (also my own design -- none was specified anywhere):
`line` is stored relative to the pick's own selection_side. The pick covers
if (selection_side's own score + line) > opponent's score, pushes if equal.
E.g. selection_side="home", line=-3.5 means "home -3.5"; home covers if
home_score - 3.5 > away_score.
"""
import math
from datetime import datetime, timedelta, timezone

from atlas import db
from backend.database import SessionLocal, init_db
from backend.fetchers import interface as api_sports_interface

GAME_LEVEL_MARKET_TYPES = {"moneyline", "1x2", "spread", "total"}


def _parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _find_final_game(sqla_db, pick: dict) -> dict | None:
    settle_date = _parse_iso(pick["settles_at"]).date()
    # The game should have started on the same UTC date settles_at falls on
    # in most cases; check the day before too for late local-time kickoffs
    # that roll into the next UTC day by settlement time.
    for candidate_date in (settle_date, settle_date - timedelta(days=1)):
        games = api_sports_interface.get_games(sqla_db, pick["sport"], candidate_date.isoformat())
        for g in games:
            if (
                g["home_team"]
                and g["away_team"]
                and g["home_team"].lower() == pick["home_team"].lower()
                and g["away_team"].lower() == pick["away_team"].lower()
            ):
                return g
    return None


def _as_float(value) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def _line_of(pick: dict) -> float | None:
    """The pick's line as a float, or None if it hasn't got a usable one.

    Postgres `numeric` arrives over PostgREST as a JSON number most of the
    time but as a string often enough (precision-preserving serialization)
    that adding it straight to an int raises TypeError mid-grade.
    """
    raw = pick.get("line")
    if raw is None:
        return None
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return None
    return value if math.isfinite(value) else None


def grade_pick(game: dict, pick: dict) -> str | None:
    """Return 'WIN' | 'LOSS' | 'PUSH', or None if not gradeable yet (game not
    final, or a required field like `line` is missing).
    """
    if game.get("final_score") is None or game.get("home_score") is None or game.get("away_score") is None:
        return None

    home_score, away_score = game["home_score"], game["away_score"]
    market_type = pick["market_type"]
    side = pick["selection_side"]

    if market_type in ("moneyline", "1x2"):
        if home_score == away_score:
            return "PUSH" if side == "draw" else "LOSS"
        winner = "home" if home_score > away_score else "away"
        return "WIN" if side == winner else "LOSS"

    if market_type == "spread":
        line = _line_of(pick)
        if line is None:
            return None
        if side not in ("home", "away"):
            # A spread has no "over" or "draw" side. Grading one as if it did
            # would quietly score it against the away team.
            return None
        own_score = home_score if side == "home" else away_score
        opp_score = away_score if side == "home" else home_score
        adjusted = own_score + line
        # Lines land on halves and quarters, which are exact in binary, but
        # the tolerance costs nothing and a push graded as a loss is money.
        if math.isclose(adjusted, opp_score, abs_tol=1e-9):
            return "PUSH"
        return "WIN" if adjusted > opp_score else "LOSS"

    if market_type == "total":
        line = _line_of(pick)
        if line is None:
            return None
        total = home_score + away_score
        if math.isclose(total, line, abs_tol=1e-9):
            return "PUSH"
        if side == "over":
            return "WIN" if total > line else "LOSS"
        if side == "under":
            return "WIN" if total < line else "LOSS"
        return None

    return None


def run(dry_run: bool = False, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    init_db()
    sqla_db = SessionLocal()

    try:
        candidates = db.get_ungraded_settled_picks(now.isoformat())

        graded: list[dict] = []
        skipped: list[dict] = []
        errors: list[dict] = []

        for pick in candidates:
            if pick["market_type"] not in GAME_LEVEL_MARKET_TYPES:
                skipped.append(
                    {
                        "pick_id": pick["id"],
                        "subject": pick["subject"],
                        "reason": f"'{pick['market_type']}' needs per-game player box scores -- no source wired in yet",
                    }
                )
                continue

            try:
                game = _find_final_game(sqla_db, pick)
            except Exception as exc:
                errors.append({"pick_id": pick["id"], "subject": pick["subject"], "error": str(exc)})
                continue

            if game is None:
                skipped.append(
                    {"pick_id": pick["id"], "subject": pick["subject"], "reason": "no matching game found in API-Sports"}
                )
                continue

            result = grade_pick(game, pick)
            if result is None:
                skipped.append(
                    {
                        "pick_id": pick["id"],
                        "subject": pick["subject"],
                        "reason": "game found but not final yet, or missing a required line",
                    }
                )
                continue

            if not dry_run:
                try:
                    db.mark_graded(pick["id"], result, now.isoformat())
                except Exception as exc:
                    # Don't count it as graded if the write didn't land --
                    # the caption would report a record that isn't in the
                    # database, and the next run would grade it again.
                    errors.append({"pick_id": pick["id"], "subject": pick["subject"], "error": str(exc)})
                    continue
            graded.append(
                {
                    "pick_id": pick["id"],
                    "subject": pick["subject"],
                    "result": result,
                    "stake": pick.get("stake"),
                    "decimal_odds": pick["decimal_odds"],
                }
            )

        summary = {"graded": graded, "skipped": skipped, "errors": errors}
        print(f"Done: {len(graded)} graded, {len(skipped)} skipped, {len(errors)} errors")
        return summary
    finally:
        sqla_db.close()


def caption(summary: dict) -> str:
    """Human-readable results summary for posting to Discord."""
    graded = summary.get("graded", [])
    if not graded:
        return "\U0001f4ca No picks graded this run."

    wins = sum(1 for g in graded if g["result"] == "WIN")
    losses = sum(1 for g in graded if g["result"] == "LOSS")
    pushes = sum(1 for g in graded if g["result"] == "PUSH")
    decided = wins + losses
    win_pct = (wins / decided * 100) if decided else 0.0

    profit = 0.0
    for g in graded:
        # Both columns are Postgres `numeric`, which PostgREST may hand back
        # as a string. Multiplying a str by a float raises; a caption that
        # crashes takes the whole Discord command down with it.
        stake = _as_float(g.get("stake"))
        odds = _as_float(g.get("decimal_odds"))
        if not stake or odds is None:
            continue
        if g["result"] == "WIN":
            profit += stake * (odds - 1)
        elif g["result"] == "LOSS":
            profit -= stake

    record = f"{wins}-{losses}" + (f"-{pushes}" if pushes else "")
    return f"\U0001f4ca Results: {record} ({win_pct:.1f}%) | P/L {profit:+.2f}"
