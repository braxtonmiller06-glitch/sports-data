"""GAME-STATE SCRIPT -- what happens under each scoreline scenario? Ideally
models "who scores first" and how each team behaves protecting a lead or
chasing a deficit -- that needs play-by-play/event data with no free
source. This uses goal-scored/conceded tendency as a weak proxy for which
team is more likely to control game state, clearly flagged as partial.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength

CORE_PATHS = ["team.avg_goals_scored", "team.avg_goals_conceded", "opponent.avg_goals_scored", "opponent.avg_goals_conceded"]
GOAL_DIFF_SPREAD = 1.0


class GameStateScriptFilter(Filter, MissingDataMixin):
    filter_id = "soccer_game_state_script"
    sport = "soccer"
    name = "Game-State Script"
    category = "context"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("missing goals scored/conceded data for team and opponent")

        team_gd = ctx.get("team.avg_goals_scored") - ctx.get("team.avg_goals_conceded")
        opp_gd = ctx.get("opponent.avg_goals_scored") - ctx.get("opponent.avg_goals_conceded")
        strength = max(-1.0, min(1.0, (team_gd - opp_gd) / GOAL_DIFF_SPREAD))

        evidence = [f"season goal difference/game: team {team_gd:+.2f} vs opponent {opp_gd:+.2f}"]
        red_flags = [
            "no play-by-play/event data available to model actual first-goal or lead-protection behavior -- "
            "this is a season-average goal-difference proxy, not a true game-state model"
        ]

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=35.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
