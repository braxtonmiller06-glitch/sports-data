"""LINEUP & ON/OFF IMPACT -- what happens with the actual lineup on the
floor? Needs lineup net-rating data API-Sports doesn't provide; degrades to
insufficient-data unless supplied.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

MIN_SAMPLE_MINUTES = 40.0
NET_RATING_SPREAD = 8.0


class LineupOnOffFilter(Filter, MissingDataMixin):
    filter_id = "wnba_lineup_on_off"
    sport = "wnba"
    name = "Lineup & On/Off Impact"
    category = "context"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if not ctx.has("lineup.on_off_net_rating"):
            return self.insufficient_data("no lineup on/off net-rating data available for this data source")

        minutes_together = ctx.get("lineup.minutes_together", 0.0)
        if minutes_together < MIN_SAMPLE_MINUTES:
            return self.void(
                f"lineup has only played {minutes_together:.0f} minutes together -- sample too small to trust"
            )

        net_rating = ctx.get("lineup.on_off_net_rating")
        strength = strength_from_z(net_rating / NET_RATING_SPREAD)
        evidence = [f"lineup net rating {net_rating:+.1f} over {minutes_together:.0f} minutes together"]

        confidence = 50.0 + min(minutes_together / 20.0, 25.0)

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=min(confidence, 85.0),
            evidence=evidence,
            red_flags=[],
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
