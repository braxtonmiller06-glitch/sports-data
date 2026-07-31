"""Unified data interface: the only module routes/ should import from.

Every function here follows the same path: check the in-process cache ->
on miss, reserve rate-limit quota -> call the API-Sports client for the
right product -> normalize -> upsert into the DB -> populate the cache ->
return normalized dicts. Callers never touch fetchers/api_sports.py or
fetchers/normalize.py directly.
"""
from datetime import date as date_cls
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from backend import cache
from backend.config import SPORTS
from backend.fetchers import api_sports
from backend.fetchers.normalize import NORMALIZERS, _record, normalize_injury, normalize_odds, normalize_player
from backend.models import Game, Odds, Team
from backend.rate_limiter import check_and_increment


class UnknownSport(Exception):
    pass


class SportNotImplemented(Exception):
    def __init__(self, sport: str):
        self.sport = sport
        super().__init__(f"'{sport}' is not implemented yet in Phase 1 (NFL and WNBA only)")


def _sport_config(sport: str) -> dict:
    sport = sport.lower()
    if sport not in SPORTS:
        raise UnknownSport(sport)
    config = SPORTS[sport]
    if not config["implemented"]:
        raise SportNotImplemented(sport)
    return config


def _normalizer(product: str, kind: str):
    return NORMALIZERS[product][kind]


def _current_year() -> str:
    return str(date_cls.today().year)


def _upsert_games(db: Session, games: list[dict]) -> None:
    for g in games:
        existing = db.get(Game, g["id"])
        if existing:
            for key, value in g.items():
                setattr(existing, key, value)
        else:
            db.add(Game(**g))
    db.commit()


def _upsert_teams(db: Session, teams: list[dict]) -> None:
    for t in teams:
        existing = db.get(Team, t["id"])
        if existing:
            for key, value in t.items():
                setattr(existing, key, value)
        else:
            db.add(Team(**t))
    db.commit()


def _persist_odds(db: Session, odds: list[dict]) -> None:
    for o in odds:
        db.add(
            Odds(
                game_id=o["game_id"],
                bookmaker=o.get("bookmaker"),
                moneyline=o.get("moneyline"),
                spread=o.get("spread"),
                total=o.get("total"),
            )
        )
    db.commit()


def _public_game(g: dict) -> dict:
    """Map the internal (DB-column-shaped) game dict to the public Game
    schema: {id, sport, home_team, away_team, date, status, home_score,
    away_score, final_score}.
    """
    final_score = None
    if g["final"] and g["home_score"] is not None and g["away_score"] is not None:
        final_score = f"{g['home_score']}-{g['away_score']}"
    return {
        "id": g["id"],
        "sport": g["sport"],
        "home_team": g["home_team_name"],
        "away_team": g["away_team_name"],
        "date": g["date"],
        "status": g["status"],
        "home_score": g["home_score"],
        "away_score": g["away_score"],
        "final_score": final_score,
    }


def _public_team(t: dict) -> dict:
    """Map the internal team dict to the public Team schema, collapsing
    wins/losses into a "W-L" record string.
    """
    return {
        "id": t["id"],
        "sport": t["sport"],
        "name": t["name"],
        "abbreviation": t["abbreviation"],
        "logo_url": t["logo_url"],
        "conference": t["conference"],
        "division": t["division"],
        "record": _record(t["wins"], t["losses"]),
    }


def get_games(db: Session, sport: str, date: Optional[str] = None) -> list[dict]:
    config = _sport_config(sport)
    date = date or date_cls.today().isoformat()
    key = cache.make_key("games", sport=sport, date=date)
    cached = cache.get(key)
    if cached is not None:
        return cached

    check_and_increment(db, config["product"])
    raw = api_sports.request(
        config["product"], "/games", params={"league": config["league_id"], "date": date}
    )
    normalize = _normalizer(config["product"], "game")
    internal_games = [normalize(sport, item) for item in raw.get("response", [])]
    _upsert_games(db, internal_games)
    games = [_public_game(g) for g in internal_games]
    cache.set(key, "games", games)
    return games


def get_teams(db: Session, sport: str) -> list[dict]:
    config = _sport_config(sport)
    key = cache.make_key("teams", sport=sport)
    cached = cache.get(key)
    if cached is not None:
        return cached

    check_and_increment(db, config["product"])
    raw = api_sports.request(config["product"], "/teams", params={"league": config["league_id"]})
    normalize = _normalizer(config["product"], "team")
    internal_teams = [normalize(sport, item) for item in raw.get("response", [])]
    _upsert_teams(db, internal_teams)
    teams = [_public_team(t) for t in internal_teams]
    cache.set(key, "teams", teams)
    return teams


def get_odds(db: Session, sport: str, date: Optional[str] = None) -> list[dict]:
    config = _sport_config(sport)
    date = date or date_cls.today().isoformat()
    key = cache.make_key("odds", sport=sport, date=date)
    cached = cache.get(key)
    if cached is not None:
        return cached

    check_and_increment(db, config["product"])
    raw = api_sports.request(
        config["product"], "/odds", params={"league": config["league_id"], "date": date}
    )
    odds: list[dict] = []
    now = datetime.now(timezone.utc).isoformat()
    for entry in raw.get("response", []):
        game_id = entry.get("game", {}).get("id") or entry.get("fixture", {}).get("id")
        for bookmaker in entry.get("bookmakers", []):
            normalized = normalize_odds(sport, game_id, bookmaker)
            normalized["timestamp"] = now
            odds.append(normalized)
    _persist_odds(db, odds)
    cache.set(key, "odds", odds)
    return odds


def get_players(db: Session, sport: str, team: Optional[str] = None, search: Optional[str] = None) -> list[dict]:
    config = _sport_config(sport)
    season = _current_year()
    key = cache.make_key("players", sport=sport, team=team, search=search, season=season)
    cached = cache.get(key)
    if cached is not None:
        return cached

    check_and_increment(db, config["product"])
    params = {"season": season}
    if team:
        params["team"] = team
    if search:
        params["search"] = search
    raw = api_sports.request(config["product"], "/players", params=params)
    players = [normalize_player(sport, item.get("player", item)) for item in raw.get("response", [])]
    cache.set(key, "players", players)
    return players


def get_standings(db: Session, sport: str, season: Optional[str] = None) -> list[dict]:
    config = _sport_config(sport)
    season = season or _current_year()
    key = cache.make_key("standings", sport=sport, season=season)
    cached = cache.get(key)
    if cached is not None:
        return cached

    check_and_increment(db, config["product"])
    raw = api_sports.request(
        config["product"], "/standings", params={"league": config["league_id"], "season": season}
    )
    normalize = _normalizer(config["product"], "standing")
    # Some products nest standings one level deeper (list-of-lists per conference/division).
    flat_response = []
    for item in raw.get("response", []):
        if isinstance(item, list):
            flat_response.extend(item)
        else:
            flat_response.append(item)
    standings = [normalize(sport, item) for item in flat_response]
    cache.set(key, "standings", standings)
    return standings


def get_injuries(db: Session, sport: str) -> list[dict]:
    config = _sport_config(sport)
    key = cache.make_key("injuries", sport=sport)
    cached = cache.get(key)
    if cached is not None:
        return cached

    check_and_increment(db, config["product"])
    raw = api_sports.request(config["product"], "/injuries", params={"league": config["league_id"]})
    injuries = [normalize_injury(sport, item) for item in raw.get("response", [])]
    cache.set(key, "injuries", injuries)
    return injuries
