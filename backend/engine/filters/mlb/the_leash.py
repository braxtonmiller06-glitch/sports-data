"""THE LEASH -- how long will the starter realistically stay in? Impacts
outs, strikeouts, earned runs, and moneyline via bullpen exposure.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

CORE_PATHS = ["pitcher.season_avg.innings_pitched", "pitcher.season_avg.pitch_count"]
INNINGS_SPREAD = 0.75


class TheLeashFilter(Filter, MissingDataMixin):
    filter_id = "mlb_the_leash"
    sport = "mlb"
    name = "The Leash"
    category = "context"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if ctx.get("model.stat") not in ("outs", "strikeouts", "earned_runs", "hits_allowed", "walks_allowed"):
            return self.insufficient_data("not a starter-workload-sensitive market")

        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("missing pitcher innings/pitch-count baseline")

        season_ip = ctx.get("pitcher.season_avg.innings_pitched")
        last5_ip = ctx.get("pitcher.last_5_avg.innings_pitched")
        if last5_ip is None:
            return self.insufficient_data("missing recent innings-pitched trend")

        strength = strength_from_z((last5_ip - season_ip) / INNINGS_SPREAD)
        evidence = [f"innings/start: season avg {season_ip:.1f} -> last 5 avg {last5_ip:.1f}"]

        red_flags = []
        if ctx.get("manager_tendencies.quick_hook") is True:
            strength -= 0.2
            evidence.append("manager has a documented quick hook")
        if not ctx.has("manager_tendencies.avg_times_through_order_pull"):
            red_flags.append("no manager times-through-order tendency data available")
        if ctx.data.get("bullpen", {}).get("innings_last_3_days", 0) and ctx.data["bullpen"]["innings_last_3_days"] > 6:
            red_flags.append("bullpen is taxed -- manager may lean on the starter longer than usual, cutting both ways")

        strength = max(-1.0, min(1.0, strength))

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=50.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
