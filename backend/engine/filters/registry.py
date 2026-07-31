"""sport -> list of Filter classes. Populated as each sport's filters are built."""
from backend.engine.filters.wnba import REGISTRY as WNBA_FILTERS

SPORT_FILTERS: dict[str, list] = {
    "wnba": WNBA_FILTERS,
    "nfl": [],
    "mlb": [],
    "soccer": [],
}


def filters_for(sport: str) -> list:
    if sport not in SPORT_FILTERS:
        raise ValueError(f"unknown sport '{sport}'")
    return SPORT_FILTERS[sport]
