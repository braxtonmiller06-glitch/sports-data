"""BULLPEN AVAILABILITY -- what happens after the starter leaves? Influences
full-game totals and moneylines. Season-long bullpen numbers alone aren't
trustworthy -- recent workload is what matters.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength

_RELEVANT_STATS = {"outs", "earned_runs", "hits_allowed", "walks_allowed"}
TAXED_INNINGS_THRESHOLD = 6.0


class BullpenAvailabilityFilter(Filter, MissingDataMixin):
    filter_id = "mlb_bullpen_availability"
    sport = "mlb"
    name = "Bullpen Availability"
    category = "context"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if ctx.get("model.stat") not in _RELEVANT_STATS and ctx.market_type not in ("moneyline", "total"):
            return self.insufficient_data("not a bullpen-sensitive market")

        if not ctx.has("bullpen.innings_last_3_days"):
            return self.insufficient_data(
                "no recent (last-3-day) bullpen workload data -- season-long aggregates alone aren't reliable here"
            )

        innings_recent = ctx.get("bullpen.innings_last_3_days")
        high_leverage_available = ctx.get("bullpen.high_leverage_available", True)
        closer_available = ctx.get("bullpen.closer_available", True)

        taxed = innings_recent > TAXED_INNINGS_THRESHOLD
        strength = 0.0
        evidence = [f"bullpen has thrown {innings_recent:.1f} innings over the last 3 days"]

        if taxed:
            strength += 0.4
            evidence.append("bullpen is taxed -- more exposure to weaker relief options if the game gets there")
        if not high_leverage_available:
            strength += 0.3
            evidence.append("high-leverage relievers unavailable")
        if not closer_available:
            strength += 0.2
            evidence.append("closer unavailable")

        strength = min(strength, 1.0)

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=50.0,
            evidence=evidence,
            red_flags=[],
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
