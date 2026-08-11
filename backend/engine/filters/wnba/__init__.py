"""WNBA filter registry.

Every filter in this package reads from a PickContext whose `.data` follows
this shape (fields may be absent -- filters must degrade gracefully, never
KeyError):

{
  "player": {
    "name": str, "position": str,
    "season_avg": {"minutes","points","rebounds","assists","fga","fg3a","fg3m",
                    "fta","ftm","usage_pct","fg3_pct","ft_pct","efg_pct"},
    "last_5_avg": {... same keys as season_avg ...},
    "recent_games": [{"date","minutes","points","fga","fg3a","fg3m","fta","ftm",
                       "rebounds","assists"}, ...],
    "injury_status": "healthy" | "questionable" | "out" | "minutes_restriction",
    "scoring_zone": {"paint_pct": float, "three_pct": float},  # often absent
  },
  "team": {"name", "pace", "off_rating", "record": {"wins","losses"}},
  "opponent": {"name", "pace", "def_rating", "foul_rate",
               "rim_defense_rating", "perimeter_defense_rating",  # often absent
               "record": {"wins","losses"}},
  "league": {"avg_pace", "avg_def_rating", "avg_off_rating", "avg_foul_rate"},
  "teammates_out": [  # only teammates OUT for *this* game
    {"name", "primary_usage_beneficiary": str | None,
     "this_player_usage_with_out": float, "this_player_baseline_usage": float}
  ],
  "lineup": {"on_off_net_rating": float, "minutes_together": float},  # often absent
  "schedule": {"games_last_7_days": int, "back_to_back": bool,
               "travel_miles": float, "rest_days": int},
  "matchup_history": {"avg_combined_pace_last_meetings": float},  # often absent
  "market": {"line": float, "over_decimal_odds": float, "under_decimal_odds": float},
  "model": {"stat": "points" | "rebounds" | "assists" | "pra", "projection": float},
}
"""
from backend.engine.filters.wnba.fatigue_schedule import FatigueScheduleFilter
from backend.engine.filters.wnba.foul_ft_environment import FoulFtEnvironmentFilter
from backend.engine.filters.wnba.lineup_on_off import LineupOnOffFilter
from backend.engine.filters.wnba.matchup_fit import MatchupFitFilter
from backend.engine.filters.wnba.pace_possession import PacePossessionFilter
from backend.engine.filters.wnba.positional_mismatch import PositionalMismatchFilter
from backend.engine.filters.wnba.price_vs_projection import PriceVsProjectionFilter
from backend.engine.filters.wnba.shooting_sustainability import ShootingSustainabilityFilter
from backend.engine.filters.wnba.usage_role_elasticity import UsageRoleElasticityFilter
from backend.engine.filters.wnba.volume_edge import VolumeEdgeFilter

REGISTRY = [
    MatchupFitFilter,
    UsageRoleElasticityFilter,
    PacePossessionFilter,
    VolumeEdgeFilter,
    PositionalMismatchFilter,
    LineupOnOffFilter,
    ShootingSustainabilityFilter,
    FatigueScheduleFilter,
    FoulFtEnvironmentFilter,
    PriceVsProjectionFilter,
]
