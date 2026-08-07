"""DEFENSIVE / BASERUNNING SUPPORT -- hidden advantages not in the
batting/pitching numbers. Valuable for close moneyline projections. Needs
outs-above-average and framing data API-Sports doesn't provide; degrades
gracefully.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength

RICH_PATHS = ["defense.outs_above_average", "defense.catcher_framing_runs"]
OAA_SPREAD = 8.0
FRAMING_SPREAD = 5.0


class DefensiveBaserunningFilter(Filter, MissingDataMixin):
    filter_id = "mlb_defensive_baserunning"
    sport = "mlb"
    name = "Defensive / Baserunning Support"
    category = "context"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if ctx.market_type not in ("moneyline",):
            return self.insufficient_data("most valuable for close moneyline reads -- not applied to this market type")

        completeness = self.data_completeness(ctx, RICH_PATHS)
        if completeness == 0.0:
            return self.insufficient_data("no defensive runs saved / framing data available for this data source")

        strengths = []
        evidence = []
        if ctx.has("defense.outs_above_average"):
            oaa = ctx.get("defense.outs_above_average")
            strengths.append(max(-1.0, min(1.0, oaa / OAA_SPREAD)))
            evidence.append(f"team defense: {oaa:+.1f} outs above average")
        if ctx.has("defense.catcher_framing_runs"):
            framing = ctx.get("defense.catcher_framing_runs")
            strengths.append(max(-1.0, min(1.0, framing / FRAMING_SPREAD)))
            evidence.append(f"catcher framing: {framing:+.1f} runs")

        strength = sum(strengths) / len(strengths)

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=self.capped_confidence(45.0, completeness),
            evidence=evidence,
            red_flags=[] if completeness == 1.0 else ["only partial defensive-support data available"],
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
