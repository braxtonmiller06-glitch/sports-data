"""sport -> list of Filter classes. Populated as each sport's filters are built.

The 10 soccer filters are shared across every soccer competition (per spec:
"SOCCER -- 10 FILTERS (MLS + EPL + Champions League + Europa + others,
league-specific baselines)") -- one filter set, calibrated per league via
context data (e.g. league.avg_shot_conversion), not a separate filter set
per competition. But backend/config.py's API layer treats each competition
as its own `sport` string (epl, la_liga, mls, serie_a, bundesliga, ligue_1)
since they're different API-Sports league_ids. SOCCER_LEAGUE_SPORTS bridges
that: every one of those sport strings resolves to the same soccer registry
and correlation groups.
"""
from backend.engine.filters.mlb import REGISTRY as MLB_FILTERS
from backend.engine.filters.nfl import REGISTRY as NFL_FILTERS
from backend.engine.filters.soccer import REGISTRY as SOCCER_FILTERS
from backend.engine.filters.wnba import REGISTRY as WNBA_FILTERS

SOCCER_LEAGUE_SPORTS = ["mls", "epl", "la_liga", "serie_a", "bundesliga", "ligue_1"]

SPORT_FILTERS: dict[str, list] = {
    "wnba": WNBA_FILTERS,
    "nfl": NFL_FILTERS,
    "mlb": MLB_FILTERS,
    **{league: SOCCER_FILTERS for league in SOCCER_LEAGUE_SPORTS},
}


def filters_for(sport: str) -> list:
    if sport not in SPORT_FILTERS:
        raise ValueError(f"unknown sport '{sport}'")
    return SPORT_FILTERS[sport]
