"""FINISHING REGRESSION -- is recent goal output sustainable? Compares
actual conversion rate (goals / shots on target) to league average, since
real xG-vs-goals isn't available.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength

CORE_PATHS = ["team.avg_goals_scored", "team.avg_shots_on_target", "league.avg_shot_conversion"]
CONVERSION_SPREAD = 0.15


class FinishingRegressionFilter(Filter, MissingDataMixin):
    filter_id = "soccer_finishing_regression"
    sport = "soccer"
    name = "Finishing Regression"
    category = "risk"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("missing goals/shots-on-target/league conversion baseline")

        sot = ctx.get("team.avg_shots_on_target")
        if sot == 0:
            return self.insufficient_data("zero average shots on target -- likely a data error")

        conversion = ctx.get("team.avg_goals_scored") / sot
        league_conversion = ctx.get("league.avg_shot_conversion")
        diff = conversion - league_conversion

        # This filter reports "is current output sustainable", not "over/under" directly:
        # over-converting (lucky finishing) -> regression risk -> negative strength (don't trust it continuing).
        strength = max(-1.0, min(1.0, -diff / CONVERSION_SPREAD))
        evidence = [f"conversion rate {conversion:.0%} vs league avg {league_conversion:.0%}"]

        red_flags = []
        if diff > CONVERSION_SPREAD:
            red_flags.append("goal output is running well above league-average conversion -- likely unsustainable")
        elif diff < -CONVERSION_SPREAD:
            red_flags.append("goal output is running well below league-average conversion -- may positively regress")

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=45.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
