"""PLATOON & LINEUP CONSTRUCTION -- is the actual batting order optimized
or compromised vs this pitcher? Evaluate the real nine-man lineup, not
overall team offense.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

CORE_PATHS = ["opposing_lineup.avg_woba_vs_hand", "pitcher.throws"]
WOBA_LEAGUE_AVG = 0.320
WOBA_SPREAD = 0.04


class PlatoonLineupFilter(Filter, MissingDataMixin):
    filter_id = "mlb_platoon_lineup"
    sport = "mlb"
    name = "Platoon & Lineup Construction"
    category = "matchup"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if ctx.market_type not in ("moneyline", "total", "team_total"):
            return self.insufficient_data("this is a player-prop market -- lineup-wide platoon read isn't directly relevant")

        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("missing opposing lineup wOBA-vs-hand data or pitcher throwing hand")

        woba = ctx.get("opposing_lineup.avg_woba_vs_hand")
        strength = strength_from_z((woba - WOBA_LEAGUE_AVG) / WOBA_SPREAD)
        throws = ctx.get("pitcher.throws")
        evidence = [f"opposing lineup's avg wOBA vs {throws}HP pitching: {woba:.3f} vs league avg {WOBA_LEAGUE_AVG:.3f}"]

        red_flags = []
        if not ctx.has("opposing_lineup.confirmed_starters"):
            red_flags.append("lineup not yet confirmed -- platoon read assumes the projected lineup holds")

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=55.0 if not red_flags else 35.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
