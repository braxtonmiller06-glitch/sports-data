"""Transforms raw API-Sports JSON (per-product shape) into the unified schema
used everywhere else in the app: {id, sport, home_team, away_team, ...}.

Field mappings below follow API-Sports' documented response conventions for
each product. Their docs site returned 403 to automated fetches while this
was written, so treat these as best-known-correct rather than byte-verified
-- if a live response has a renamed field, the fix is localized to the one
`_dig(...)` line here, not a redesign. `_dig` never raises on a missing key,
so a mismatch degrades to a null field instead of a crash.
"""
from typing import Any, Optional


def _dig(obj: Any, *path: str, default=None):
    """Safe nested dict access: _dig(d, "a", "b") -> d.get("a", {}).get("b")."""
    current = obj
    for key in path:
        if not isinstance(current, dict):
            return default
        current = current.get(key)
    return current if current is not None else default


def _record(wins: Optional[int], losses: Optional[int]) -> Optional[str]:
    if wins is None or losses is None:
        return None
    return f"{wins}-{losses}"


def _win_pct(wins: int, losses: int) -> Optional[float]:
    total = wins + losses
    return round(wins / total, 3) if total > 0 else None


# ---------------------------------------------------------------------------
# American Football (NFL) -- game object nested under "game", scores under
# "scores.{home,away}.total"
# ---------------------------------------------------------------------------


def normalize_game_american_football(sport: str, raw: dict) -> dict:
    game_id = _dig(raw, "game", "id")
    status_short = _dig(raw, "game", "status", "short", default="")
    home_score = _dig(raw, "scores", "home", "total")
    away_score = _dig(raw, "scores", "away", "total")
    final = status_short in ("FT", "AOT")

    return {
        "id": f"{sport}_{game_id}",
        "sport": sport,
        "date": _dig(raw, "game", "date", "date", default=""),
        "status": _dig(raw, "game", "status", "long", default=status_short),
        "home_team_id": f"{sport}_{_dig(raw, 'teams', 'home', 'id')}",
        "home_team_name": _dig(raw, "teams", "home", "name"),
        "away_team_id": f"{sport}_{_dig(raw, 'teams', 'away', 'id')}",
        "away_team_name": _dig(raw, "teams", "away", "name"),
        "home_score": home_score,
        "away_score": away_score,
        "final": final,
    }


def normalize_team_american_football(sport: str, raw: dict) -> dict:
    team_id = raw.get("id")
    return {
        "id": f"{sport}_{team_id}",
        "sport": sport,
        "name": raw.get("name"),
        "abbreviation": raw.get("code"),
        "logo_url": raw.get("logo"),
        "conference": None,
        "division": None,
        "wins": None,
        "losses": None,
    }


def normalize_standing_american_football(sport: str, raw: dict) -> dict:
    wins = _dig(raw, "won") or 0
    losses = _dig(raw, "lost") or 0
    return {
        "sport": sport,
        "team_id": f"{sport}_{_dig(raw, 'team', 'id')}",
        "team_name": _dig(raw, "team", "name"),
        "wins": wins,
        "losses": losses,
        "win_pct": _win_pct(wins, losses),
        "conference": _dig(raw, "conference", "name"),
        "division": _dig(raw, "division", "name"),
        "rank": raw.get("position"),
    }


# ---------------------------------------------------------------------------
# Basketball (WNBA / NBA) -- flat top-level fields (id/date/status not
# nested under a "game" key), scores under "scores.{home,away}.total"
# ---------------------------------------------------------------------------


def normalize_game_basketball(sport: str, raw: dict) -> dict:
    game_id = raw.get("id")
    status_short = _dig(raw, "status", "short", default="")
    home_score = _dig(raw, "scores", "home", "total")
    away_score = _dig(raw, "scores", "away", "total")
    final = status_short in ("FT", "AOT")

    return {
        "id": f"{sport}_{game_id}",
        "sport": sport,
        "date": (raw.get("date") or "")[:10],
        "status": _dig(raw, "status", "long", default=status_short),
        "home_team_id": f"{sport}_{_dig(raw, 'teams', 'home', 'id')}",
        "home_team_name": _dig(raw, "teams", "home", "name"),
        "away_team_id": f"{sport}_{_dig(raw, 'teams', 'away', 'id')}",
        "away_team_name": _dig(raw, "teams", "away", "name"),
        "home_score": home_score,
        "away_score": away_score,
        "final": final,
    }


def normalize_team_basketball(sport: str, raw: dict) -> dict:
    team_id = raw.get("id")
    return {
        "id": f"{sport}_{team_id}",
        "sport": sport,
        "name": raw.get("name"),
        "abbreviation": raw.get("code") or raw.get("nickname"),
        "logo_url": raw.get("logo"),
        "conference": None,
        "division": None,
        "wins": None,
        "losses": None,
    }


def normalize_standing_basketball(sport: str, raw: dict) -> dict:
    wins = _dig(raw, "games", "win", "total") or 0
    losses = _dig(raw, "games", "lose", "total") or 0
    return {
        "sport": sport,
        "team_id": f"{sport}_{_dig(raw, 'team', 'id')}",
        "team_name": _dig(raw, "team", "name"),
        "wins": wins,
        "losses": losses,
        "win_pct": _win_pct(wins, losses),
        "conference": _dig(raw, "conference", "name"),
        "division": _dig(raw, "division", "name"),
        "rank": _dig(raw, "position"),
    }


# ---------------------------------------------------------------------------
# Shared: player + odds normalization is close enough across products to
# share one function, driven by the same _dig() defensive access pattern.
# ---------------------------------------------------------------------------


def normalize_player(sport: str, raw: dict) -> dict:
    player_id = raw.get("id")
    return {
        "id": f"{sport}_{player_id}",
        "sport": sport,
        "name": raw.get("name") or f"{raw.get('firstname', '')} {raw.get('lastname', '')}".strip(),
        "team_id": None,
        "position": _dig(raw, "position") or _dig(raw, "leagues", "standard", "position"),
        "number": _dig(raw, "number") or _dig(raw, "leagues", "standard", "jersey"),
    }


def normalize_odds(sport: str, game_id: str, raw_bookmaker: dict) -> dict:
    bets = {b.get("name"): b.get("values") for b in raw_bookmaker.get("bets", [])}

    def _values(bet_name: str) -> list[dict]:
        return bets.get(bet_name, []) or []

    moneyline_values = _values("Moneyline") or _values("Match Winner")
    spread_values = _values("Point Spread") or _values("Handicap")
    total_values = _values("Total Points") or _values("Over/Under")

    return {
        "game_id": f"{sport}_{game_id}",
        "bookmaker": raw_bookmaker.get("name"),
        "moneyline": {v.get("value"): v.get("odd") for v in moneyline_values} or None,
        "spread": {v.get("value"): v.get("odd") for v in spread_values} or None,
        "total": {v.get("value"): v.get("odd") for v in total_values} or None,
    }


def normalize_injury(sport: str, raw: dict) -> dict:
    return {
        "sport": sport,
        "player_id": f"{sport}_{_dig(raw, 'player', 'id')}" if _dig(raw, "player", "id") else None,
        "player_name": _dig(raw, "player", "name", default="Unknown"),
        "team_id": f"{sport}_{_dig(raw, 'team', 'id')}" if _dig(raw, "team", "id") else None,
        "team_name": _dig(raw, "team", "name"),
        "status": _dig(raw, "player", "status") or raw.get("status"),
        "description": _dig(raw, "player", "description") or raw.get("description"),
    }


NORMALIZERS = {
    "american-football": {
        "game": normalize_game_american_football,
        "team": normalize_team_american_football,
        "standing": normalize_standing_american_football,
    },
    "basketball": {
        "game": normalize_game_basketball,
        "team": normalize_team_basketball,
        "standing": normalize_standing_basketball,
    },
}
