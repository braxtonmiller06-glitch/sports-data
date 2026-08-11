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
import math
import re
import sys
from datetime import datetime, timezone

from atlas import db, loadplays
from backend.database import SessionLocal, init_db
from backend.fetchers import interface as api_sports_interface

CLOSING_WINDOW_MINUTES = 15
GAME_LEVEL_MARKET_TYPES = {"moneyline", "1x2", "spread", "total"}


class UnpricedOdds(ValueError):
    """A closing price that can't be used for CLV."""


def compute_clv_pct(bet_decimal_odds: float, closing_decimal_odds: float) -> float:
    """Positive = you beat the closing line (got better odds than the closer).

    Both prices must be real decimal odds (> 1.0). A bookmaker feed that
    returns 0, a negative, or a bare "1" used to divide by zero here or
    produce a nonsense CLV that would then be stored as if it were real.
    """
    if not (isinstance(bet_decimal_odds, (int, float)) and isinstance(closing_decimal_odds, (int, float))):
        raise UnpricedOdds("decimal odds must be numeric")
    if not math.isfinite(bet_decimal_odds) or not math.isfinite(closing_decimal_odds):
        raise UnpricedOdds("decimal odds must be finite")
    if bet_decimal_odds <= 1.0 or closing_decimal_odds <= 1.0:
        raise UnpricedOdds(
            f"decimal odds must be > 1.0 (bet={bet_decimal_odds}, closing={closing_decimal_odds})"
        )
    return ((bet_decimal_odds / closing_decimal_odds) - 1) * 100


def _game_start_time(pick: dict) -> datetime:
    settles_at = loadplays._parse_iso(pick["settles_at"])
    bucket = loadplays._settle_bucket(pick["sport"])
    if bucket not in loadplays.SETTLE_BUFFERS:
        raise KeyError(f"no settlement buffer configured for sport '{pick['sport']}' (bucket '{bucket}')")
    return settles_at - loadplays.SETTLE_BUFFERS[bucket]


def find_picks_due(picks: list[dict], now: datetime, window_minutes: int = CLOSING_WINDOW_MINUTES) -> list[dict]:
    """Picks whose game starts within the next `window_minutes` (and hasn't
    already started -- a negative minutes_until means kickoff already passed).

    One unparseable pick must not take the whole run down with it: this job
    is a cron that has a single 15-minute window per game to do its job, and
    a crash here means every pick in the batch silently loses its CLV.
    """
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    due = []
    for pick in picks:
        try:
            start = _game_start_time(pick)
        except (KeyError, ValueError, TypeError) as exc:
            print(f"SKIPPING pick {pick.get('id', '?')}: can't determine game start -- {exc}")
            continue
        # Postgres timestamptz comes back with an offset, but a column that
        # was ever declared plain `timestamp` does not, and subtracting a
        # naive from an aware datetime raises.
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        minutes_until = (start - now).total_seconds() / 60
        if 0 <= minutes_until <= window_minutes:
            due.append(pick)
    return due


_WORD_RE = re.compile(r"[a-z0-9]+")


def _match_odds_value(odds_dict: dict | None, selection_side: str, home_team: str, away_team: str) -> float | None:
    """Pick this selection's price out of a bookmaker's {label: odd} map.

    Matching is on whole words, not substrings. Two things went wrong with
    substring matching:
      - "over" is a substring of the label "Under/Over 45.5", so an over
        selection matched a label that prices neither side on its own.
      - "x" (a draw shorthand) is a substring of a great many words, so a
        draw selection matched essentially any label it saw first.
    Both returned a real-looking float from the wrong market, which is worse
    than returning nothing: it gets stored as the closing line and silently
    poisons the CLV column.

    Ambiguous labels -- ones matching more than one side's tokens -- are
    rejected rather than resolved by dict ordering.
    """
    if not odds_dict:
        return None

    all_sides = {
        "home": {"home", *_words(home_team)},
        "away": {"away", *_words(away_team)},
        "draw": {"draw", "tie"},
        "over": {"over"},
        "under": {"under"},
    }
    if selection_side not in all_sides:
        return None
    wanted = all_sides[selection_side]
    # Tokens belonging to the *opposing* side of the same market. A label
    # carrying both ("Under/Over") prices neither on its own.
    rivals = {
        "home": all_sides["away"] | all_sides["draw"],
        "away": all_sides["home"] | all_sides["draw"],
        "draw": all_sides["home"] | all_sides["away"],
        "over": all_sides["under"],
        "under": all_sides["over"],
    }[selection_side]

    # Soccer 1x2 markets label the three outcomes as bare "1" / "X" / "2".
    # Matched as whole labels rather than as tokens, because "1" and "2" turn
    # up inside plenty of other labels ("Over 1.5") where they mean a line,
    # not a side.
    bare = {"home": "1", "draw": "x", "away": "2"}.get(selection_side)

    for key, value in odds_dict.items():
        label = str(key).strip().lower()
        words = _words(label)
        if label == bare:
            pass
        elif not (words & wanted) or (words & rivals):
            continue
        price = _to_decimal_odds(value)
        if price is not None:
            return price
    return None


def _words(text: str) -> set[str]:
    return set(_WORD_RE.findall(text.lower()))


def _to_decimal_odds(value) -> float | None:
    """Normalize a bookmaker price to decimal odds, or None if it isn't one.

    API-Sports passes through whatever format each book publishes, and the
    same feed carries both: "-150" (American) alongside "1.85" (decimal).
    compute_clv_pct divides one price by another and only means anything if
    both are decimal -- feeding it a raw -150 produced a confident, wildly
    wrong CLV that was then written to the database as fact.

    The two ranges don't overlap in practice: American prices are >= +100 or
    <= -100, decimal prices sit between 1.0 and (well below) 100. A decimal
    price of exactly 100.0 (a 99/1 shot) is indistinguishable from American
    +100 and is read as American; that trade is worth it to catch the far
    more common +100.
    """
    try:
        price = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(price):
        return None

    if price >= 100:  # American underdog: +150 -> 2.50
        return 1.0 + price / 100.0
    if price <= -100:  # American favourite: -150 -> 1.667
        return 1.0 - 100.0 / price
    if price > 1.0:  # already decimal
        return price
    # Between -100 and 1.0: a 0, a negative that isn't a valid American
    # price, or a "price" of 1.0 that pays nothing. Not usable.
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

            try:
                clv_pct = compute_clv_pct(pick["decimal_odds"], closing_odds)
            except UnpricedOdds as exc:
                print(f"SKIPPING closing line for pick {pick['id']} ({pick['subject']}): {exc}")
                skipped += 1
                continue

            if not dry_run:
                try:
                    db.record_closing_line(pick["id"], closing_odds, clv_pct)
                except Exception as exc:
                    # One failed write must not abandon the rest of the batch:
                    # every remaining pick has its own closing window and
                    # there is no second chance once the game starts.
                    errors.append({"pick_id": pick["id"], "error": str(exc)})
                    continue
            recorded += 1

        summary = {"due": len(due), "recorded": recorded, "skipped": skipped, "errors": errors}
        print(f"Done: {summary}")
        return summary
    finally:
        sqla_db.close()


if __name__ == "__main__":
    run(dry_run="--dry-run" in sys.argv)
