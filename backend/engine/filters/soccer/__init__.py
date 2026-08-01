"""Soccer filter registry (MLS + EPL + La Liga + Serie A + Bundesliga + Ligue 1).

This is the weakest data story of the four sports (flagged during the
ARCHITECT phase): real xG, tactical/formation, pressing, transition, and
set-piece xG data all require paid providers (Opta/StatsBomb) -- there's no
clean free equivalent to nflfastR or even pybaseball for soccer. Filters
here fall into three buckets:

1. Real signal from API-Sports match statistics (shots on target, corners,
   possession, cards) -- chance_quality_xg (a shots-on-target-rate PROXY for
   xG, not real xG), finishing_regression, set_piece_edge, fixture_congestion,
   home_away_travel, starting_xi_injury_cascade, market_price_gap.
2. Partial/weak proxy where the ideal data doesn't exist -- game_state_script.
3. Honest permanent insufficient-data stubs where NO free proxy exists at
   all -- tactical_mismatch, transition_threat. These are still real filter
   classes (satisfying the "every filter returns the 7-field output" rule)
   so the pattern stays uniform across sports; they just always report low
   confidence until a paid data source is wired in.

PickContext.data shape (fields may be absent -- filters degrade gracefully):

{
  "team": {"name", "avg_shots": float, "avg_shots_on_target": float, "avg_goals_scored": float,
            "avg_goals_conceded": float, "avg_corners_for": float, "avg_corners_against": float,
            "avg_possession": float, "home_record": {"wins","draws","losses","goals_scored","goals_conceded"},
            "away_record": {...}},
  "opponent": {... same shape ...},
  "league": {"avg_shot_conversion": float, "avg_corners_per_game": float},
  "schedule": {"games_last_7_days": int, "games_last_14_days": int, "travel_km": float},
  "key_absences": [{"name","position","season_goals","season_assists","season_key_passes",
                     "replacement_name","historically_absorbs_role": bool}],
  "market": {"line","over_decimal_odds","under_decimal_odds","line_open","line_current"},
  "model": {"stat": "team_total_goals"|"btts"|"moneyline"|"draw_no_bet"|"player_shots_on_target", "projection": float},
}
"""
from backend.engine.filters.soccer.chance_quality_xg import ChanceQualityXgFilter
from backend.engine.filters.soccer.finishing_regression import FinishingRegressionFilter
from backend.engine.filters.soccer.fixture_congestion import FixtureCongestionFilter
from backend.engine.filters.soccer.game_state_script import GameStateScriptFilter
from backend.engine.filters.soccer.home_away_travel import HomeAwayTravelFilter
from backend.engine.filters.soccer.market_price_gap import MarketPriceGapFilter
from backend.engine.filters.soccer.set_piece_edge import SetPieceEdgeFilter
from backend.engine.filters.soccer.starting_xi_injury_cascade import StartingXiInjuryCascadeFilter
from backend.engine.filters.soccer.tactical_mismatch import TacticalMismatchFilter
from backend.engine.filters.soccer.transition_threat import TransitionThreatFilter

REGISTRY = [
    ChanceQualityXgFilter,
    FinishingRegressionFilter,
    TacticalMismatchFilter,
    TransitionThreatFilter,
    SetPieceEdgeFilter,
    StartingXiInjuryCascadeFilter,
    FixtureCongestionFilter,
    HomeAwayTravelFilter,
    GameStateScriptFilter,
    MarketPriceGapFilter,
]
