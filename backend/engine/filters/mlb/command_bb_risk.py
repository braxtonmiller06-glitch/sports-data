"""PITCHER COMMAND & BB RISK -- is the pitcher likely to create extra
baserunners? Elite K stuff can still be dangerous for OVERS due to walks.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

BB_RATE_SPREAD = 0.04
_WALK_SENSITIVE_STATS = {"walks_allowed", "hits_allowed", "earned_runs", "outs"}


class CommandBbRiskFilter(Filter, MissingDataMixin):
    filter_id = "mlb_command_bb_risk"
    sport = "mlb"
    name = "Pitcher Command & BB Risk"
    category = "risk"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if ctx.get("model.stat") not in _WALK_SENSITIVE_STATS:
            return self.insufficient_data("market stat isn't sensitive to walk/baserunner risk")

        command = ctx.data.get("statcast", {}).get("pitcher_command")
        if not command or command.get("bb_rate") is None:
            return self.insufficient_data("no command/walk-rate data available for this pitcher")

        league_bb_rate = ctx.get("league.avg_bb_rate", 0.08)
        bb_diff = command["bb_rate"] - league_bb_rate

        # For "outs" (pitcher going deep into games), elevated walks -> fewer outs -> UNDER.
        # For walks/hits/earned-runs-allowed markets, elevated walks -> MORE of the stat -> OVER.
        direction = -1.0 if ctx.get("model.stat") == "outs" else 1.0
        strength = direction * strength_from_z(bb_diff / BB_RATE_SPREAD)

        evidence = [
            f"BB rate {command['bb_rate']:.1%} vs league avg {league_bb_rate:.1%}",
            f"zone rate {command['zone_rate']:.1%}",
        ]

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
