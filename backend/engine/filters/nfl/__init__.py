"""NFL filter registry.

PickContext.data shape (fields may be absent -- filters degrade gracefully):

{
  "player": {
    "name", "position",  # QB/RB/WR/TE
    "season_avg": {"snaps","routes","targets","carries","receptions","rec_yards",
                    "rush_yards","pass_yards","pass_attempts","completions",
                    "touchdowns","red_zone_touches","team_snaps"},
    "last_5_avg": {... same keys ...},
    "recent_games": [{...same stat keys..., "date"}],
    "injury_status": "healthy" | "questionable" | "doubtful" | "out",
    "pressure_resistant": bool,  # explicit override, often absent
  },
  "team": {"name","abbreviation","off_pass_rate","off_rush_rate","record":{"wins","losses"}},
  "opponent": {"name","abbreviation","def_pressure_rate","def_pass_epa_allowed",
               "def_rush_epa_allowed","def_explosive_play_rate", "record":{...}},
  "league": {"avg_pressure_rate","avg_pass_epa","avg_rush_epa","avg_explosive_play_rate"},
  "game": {"spread": float, "total": float, "is_home": bool},  # spread: + means this team favored
  "line_ol_dl": {"team_pass_block_win_rate","opponent_pass_rush_win_rate",
                 "team_run_block_win_rate","opponent_run_stop_win_rate"},  # often absent
  "weather": {"wind_mph","precip","temp_f","is_dome"},  # no live source wired yet -- see weather.py
  "key_absences": [{"name","position","replacement_name","historically_absorbs_role": bool}],
  "market": {"line","over_decimal_odds","under_decimal_odds","line_open","line_current"},
  "model": {"stat": "pass_yards"|"rush_yards"|"receptions"|"receiving_yards"|"anytime_td", "projection": float},
  "scheme": {  # populated from fetchers/nflfastr.py, injected by the caller before analyze()
    "qb_coverage_splits", "team_coverage_rate", "rb_box_efficiency",
    "receiver_coverage_splits", "receiver_season_separation",
  },
}
"""
from backend.engine.filters.nfl.coverage_matchup import CoverageMatchupFilter
from backend.engine.filters.nfl.coverage_scheme_vs_qb import CoverageSchemeVsQbFilter
from backend.engine.filters.nfl.explosive_play import ExplosivePlayFilter
from backend.engine.filters.nfl.expected_volume import ExpectedVolumeFilter
from backend.engine.filters.nfl.game_script import GameScriptFilter
from backend.engine.filters.nfl.injury_impact import InjuryReplacementImpactFilter
from backend.engine.filters.nfl.man_vs_zone_route import ManVsZoneRouteFilter
from backend.engine.filters.nfl.market_price import MarketPriceIntegrityFilter
from backend.engine.filters.nfl.ol_vs_dl import OlVsDlFilter
from backend.engine.filters.nfl.qb_pressure_stress import QbPressureStressTestFilter
from backend.engine.filters.nfl.rb_run_fit import RbRunFitFilter
from backend.engine.filters.nfl.red_zone_role import RedZoneRoleFilter
from backend.engine.filters.nfl.weather import WeatherEnvironmentFilter

REGISTRY = [
    QbPressureStressTestFilter,
    CoverageMatchupFilter,
    OlVsDlFilter,
    ExpectedVolumeFilter,
    RedZoneRoleFilter,
    ExplosivePlayFilter,
    GameScriptFilter,
    WeatherEnvironmentFilter,
    InjuryReplacementImpactFilter,
    MarketPriceIntegrityFilter,
    CoverageSchemeVsQbFilter,
    RbRunFitFilter,
    ManVsZoneRouteFilter,
]
