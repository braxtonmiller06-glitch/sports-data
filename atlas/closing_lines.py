"""atlas/closing_lines.py -- shortly before each pending pick's game start,
fetch the current odds and record the closing line (+ CLV) via
db.record_closing_line. Until this runs for a pick, closing_decimal_odds
and clv_pct stay null and the site's CLV column is empty for it.

Uses API-Sports (via backend/fetchers), not BALLDONTLIE -- BALLDONTLIE's
odds endpoints are paid-tier-only and MLB/WNBA don't have odds endpoints on
BALLDONTLIE at all (confirmed against their MCP tool listing before
building this). Revisit if/when the GOAT tier gets purchased.

CAVEATS, all a consequence of bridging two systems that don't share an ID
space (Supabase picks carry BALLDONTLIE's external_event_id; API-Sports has
its own game IDs):
- Picks are matched to API-Sports games by (sport, home_team, away_team)
  exact case-insensitive match, not by ID.
- Only game-level markets (moneyline/1x2, spread, total) are supported --
  that's all backend/fetchers' API-Sports odds integration returns. Player-
  prop picks are skipped with a clear message, not silently dropped.
- Odds "value" labels vary by bookmaker (fetchers/normalize.py's own
  documented caveat -- e.g. "Home -3.5", "Over 45.5", or just "Home"). This
  does substring matching on the selection side/team name rather than an
  exact key, but is UNVERIFIED against real API-Sports odds responses --
  same sandbox network restriction as fetchers/pybaseball_client.py. Verify
  once real odds data is reachable; a label mismatch is a one-function fix.
"""
import sys
from datetime import datetime, timezone

from atlas import db, loadplays
from backend.database import SessionLocal, init_db
from backend.fetchers import interface as api_sports_interface

CLOSING_WINDOW_MINUTES = 15
GAME_LEVEL_MARKET_TYPES = {"moneyline", "1x2", "spread", "total"}


def compute_clv_pct(bet_decimal_odds: float, closing_decimal_odds: float) -> float:
    """Positive = you beat the closing line (got better odds than the closer)."""
    return ((bet_decimal_odds / closing_decimal_odds) - 1) * 100


def _game_start_time(pick: dict) -> datetime:
    settles_at = loadplays._parse_iso(pick["settles_at"])
    buffer = loadplays.SETTLE_BUFFERS[loadplays._settle_bucket(pick["sport"])]
    return settles_at - buffer


def find_picks_due(picks: list[dict], now: datetime, window_minutes: int = CLOSING_WINDOW_MINUTES) -> list[dict]:
    """Picks whose game starts within the next `window_minutes` (and hasn't
    already started -- a negative minutes_until means kickoff already passed).
    """
    due = []
    for pick in picks:
        minutes_until = (_game_start_time(pick) - now).total_seconds() / 60
        if 0 <= minutes_until <= window_minutes:
            due.append(pick)
    return due


def _match_odds_value(odds_dict: dict | None, selection_side: str, home_team: str, away_team: str) -> float | None:
    if not odds_dict:
        return None
    side_tokens = {
        "home": ["home", home_team.lower()],
        "away": ["away", away_team.lower()],
        "draw": ["draw", "tie", "x"],
        "over": ["over"],
        "under": ["under"],
    }.get(selection_side, [])
    for key, value in odds_dict.items():
        if any(token in str(key).lower() for token in side_tokens):
            try:
                return float(value)
            except (TypeError, ValueError):
                continue
    return None


def fetch_closing_odds(sqla_db, pick: dict) -> float | None:
    sport = pick["sport"]
    game_date = _game_start_time(pick).date().isoformat()

    games = api_sports_interface.get_games(sqla_db, sport, game_date)
    matched_game = next(
        (
            g
            for g in games
            if g["home_team"]
            and g["away_team"]
            and g["home_team"].lower() == pick["home_team"].lower()
            and g["away_team"].lower() == pick["away_team"].lower()
        ),
        None,
    )
    if matched_game is None:
        return None

    odds_list = api_sports_interface.get_odds(sqla_db, sport, game_date)
    game_odds = [o for o in odds_list if o["game_id"] == matched_game["id"]]

    odds_key = "moneyline" if pick["market_type"] in ("moneyline", "1x2") else pick["market_type"]
    for entry in game_odds:
        value = _match_odds_value(entry.get(odds_key), pick["selection_side"], pick["home_team"], pick["away_team"])
        if value is not None:
            return value
    return None


def run(dry_run: bool = False, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    init_db()
    sqla_db = SessionLocal()

    try:
        due = find_picks_due(db.get_picks_without_closing_line(), now)

        recorded, skipped, errors = 0, 0, []
        for pick in due:
            if pick["market_type"] not in GAME_LEVEL_MARKET_TYPES:
                print(
                    f"SKIPPING closing line for pick {pick['id']} ({pick['subject']}): "
                    f"'{pick['market_type']}' isn't a game-level market -- no odds source available yet"
                )
                skipped += 1
                continue

            try:
                closing_odds = fetch_closing_odds(sqla_db, pick)
            except Exception as exc:
                errors.append({"pick_id": pick["id"], "error": str(exc)})
                continue

            if closing_odds is None:
                print(
                    f"SKIPPING closing line for pick {pick['id']} ({pick['subject']}): "
                    "no matching odds found in today's API-Sports feed"
                )
                skipped += 1
                continue

            clv_pct = compute_clv_pct(pick["decimal_odds"], closing_odds)
            if not dry_run:
                db.record_closing_line(pick["id"], closing_odds, clv_pct)
            recorded += 1

        summary = {"due": len(due), "recorded": recorded, "skipped": skipped, "errors": errors}
        print(f"Done: {summary}")
        return summary
    finally:
        sqla_db.close()


if __name__ == "__main__":
    run(dry_run="--dry-run" in sys.argv)
