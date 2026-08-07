"""BATTED-BALL QUALITY / REGRESSION -- are recent results supported by
quality of contact, or inflated by results-based luck?
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

HARD_HIT_LEAGUE_AVG = 0.38
EXIT_VELO_SPREAD = 3.0


class BattedBallQualityFilter(Filter, MissingDataMixin):
    filter_id = "mlb_batted_ball_quality"
    sport = "mlb"
    name = "Batted-Ball Quality / Regression"
    category = "risk"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        quality = ctx.data.get("statcast", {}).get("batted_ball_quality")
        if not quality or quality.get("avg_exit_velo") is None:
            return self.insufficient_data("no batted-ball quality data available")
        if quality.get("balls_in_play", 0) < 10:
            return self.void(f"only {quality.get('balls_in_play', 0)} balls in play -- sample too small to read quality of contact")

        league_avg_velo = 88.5  # Statcast league-average exit velocity, roughly stable year to year
        velo_strength = strength_from_z((quality["avg_exit_velo"] - league_avg_velo) / EXIT_VELO_SPREAD)
        hard_hit_strength = strength_from_z((quality["hard_hit_rate"] - HARD_HIT_LEAGUE_AVG) / 0.08)
        strength = (velo_strength + hard_hit_strength) / 2

        evidence = [
            f"avg exit velo {quality['avg_exit_velo']:.1f} mph vs league avg {league_avg_velo:.1f}",
            f"hard-hit rate {quality['hard_hit_rate']:.1%} vs league avg {HARD_HIT_LEAGUE_AVG:.1%}",
        ]

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=55.0,
            evidence=evidence,
            red_flags=[],
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
