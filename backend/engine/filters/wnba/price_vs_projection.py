"""PRICE VS TRUE PROJECTION -- even if the player performs well, is the
line still wrong? A great prediction can still be a bad bet if the price
already reflects it.
"""
import statistics

from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

CORE_PATHS = ["model.projection", "market.line"]
MIN_RECENT_GAMES_FOR_STD = 5
FALLBACK_STD_FRACTION = 0.20  # if we can't compute a real std, assume 20% of the projection


class PriceVsProjectionFilter(Filter, MissingDataMixin):
    filter_id = "wnba_price_vs_projection"
    sport = "wnba"
    name = "Price vs True Projection"
    category = "price"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("no model projection or market line available for this pick yet")

        projection = ctx.get("model.projection")
        line = ctx.get("market.line")
        stat = ctx.get("model.stat", "points")

        recent_games = ctx.data.get("player", {}).get("recent_games") or []
        values = [g.get(stat) for g in recent_games if g.get(stat) is not None]
        if len(values) >= MIN_RECENT_GAMES_FOR_STD:
            player_std = statistics.pstdev(values) or (projection * FALLBACK_STD_FRACTION)
            std_source = f"{len(values)}-game sample stdev"
        else:
            player_std = projection * FALLBACK_STD_FRACTION
            std_source = "fallback estimate (insufficient game sample for real stdev)"

        z = (projection - line) / max(player_std, 0.01)
        strength = strength_from_z(z, scale=0.4)

        evidence = [
            f"model projects {projection:.1f} {stat} vs market line {line:.1f} "
            f"({z:+.2f} std devs, {std_source})"
        ]
        red_flags = []
        if len(values) < MIN_RECENT_GAMES_FOR_STD:
            red_flags.append("player variance estimated, not measured -- confidence capped")
        if self.historical_accuracy.last_30 is not None and self.historical_accuracy.last_30 < 0.5:
            red_flags.append(
                f"this filter's own last-30-day accuracy is {self.historical_accuracy.last_30:.0%} -- "
                "recent model projections have been unreliable"
            )

        confidence = 65.0 if len(values) >= MIN_RECENT_GAMES_FOR_STD else 35.0

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=confidence,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
