"""MLB filter registry.

PickContext.data shape (fields may be absent -- filters degrade gracefully):

{
  "pitcher": {"name", "throws": "L"|"R",
              "season_avg": {"pitch_count","innings_pitched","strikeouts","walks",
                              "earned_runs","batters_faced"},
              "last_5_avg": {... same ...}, "injury_status"},
  "batter": {"name", "bats": "L"|"R",
             "season_avg": {"avg","obp","slg","iso","woba"}, "last_5_avg": {...}},
  "opposing_lineup": {"avg_woba_vs_hand": float, "contact_rate_vs_dominant_pitch": float},
  "team": {"name"}, "opponent": {"name"},
  "league": {"avg_k_rate","avg_bb_rate","avg_era","avg_hard_hit_rate"},
  "game": {"total": float, "spread": float},
  "ballpark": {"park_factor": float, "is_dome": bool},
  "weather": {"wind_mph","wind_direction","temp_f"},  # no live source wired yet -- see ballpark_weather.py
  "bullpen": {"innings_last_3_days": float, "high_leverage_available": bool, "closer_available": bool},
  "manager_tendencies": {"avg_times_through_order_pull": float, "quick_hook": bool},
  "umpire": {"strike_zone_size_factor": float},  # often absent
  "defense": {"outs_above_average": float, "catcher_framing_runs": float},  # often absent
  "market": {"line","over_decimal_odds","under_decimal_odds","line_open","line_current"},
  "model": {"stat": "strikeouts"|"earned_runs"|"outs"|"hits_allowed"|"total_bases"|"walks_allowed", "projection": float},
  "statcast": {  # from fetchers/pybaseball_client.py, injected by the caller.
    "pitcher_arsenal", "pitcher_whiff_profile", "pitcher_command",
    "batted_ball_quality", "batter_vs_primary_pitch",
    # NOTE: pybaseball's data hosts are blocked in the dev sandbox (see
    # fetchers/pybaseball_client.py) -- this block's shape is verified by
    # logic-only testing against a synthetic DataFrame, not a live pull.
  },
}
"""
from backend.engine.filters.mlb.arsenal_vs_lineup import ArsenalVsLineupFilter
from backend.engine.filters.mlb.ballpark_weather import BallparkWeatherFilter
from backend.engine.filters.mlb.batted_ball_quality import BattedBallQualityFilter
from backend.engine.filters.mlb.bullpen_availability import BullpenAvailabilityFilter
from backend.engine.filters.mlb.command_bb_risk import CommandBbRiskFilter
from backend.engine.filters.mlb.defensive_baserunning import DefensiveBaserunningFilter
from backend.engine.filters.mlb.platoon_lineup import PlatoonLineupFilter
from backend.engine.filters.mlb.the_leash import TheLeashFilter
from backend.engine.filters.mlb.umpire_market_price import UmpireMarketPriceFilter
from backend.engine.filters.mlb.whiff_profile import WhiffProfileFilter

REGISTRY = [
    ArsenalVsLineupFilter,
    WhiffProfileFilter,
    CommandBbRiskFilter,
    TheLeashFilter,
    BattedBallQualityFilter,
    BullpenAvailabilityFilter,
    BallparkWeatherFilter,
    PlatoonLineupFilter,
    DefensiveBaserunningFilter,
    UmpireMarketPriceFilter,
]
