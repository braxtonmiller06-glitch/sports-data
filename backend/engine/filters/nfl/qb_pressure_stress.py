"""QB PRESSURE STRESS TEST -- can the opposing defense consistently disrupt the QB?"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

CORE_PATHS = ["opponent.def_pressure_rate", "league.avg_pressure_rate"]
RATE_SPREAD = 0.06  # 6 percentage points of pressure-rate deviation = one "unit"


class QbPressureStressTestFilter(Filter, MissingDataMixin):
    filter_id = "nfl_qb_pressure_stress"
    sport = "nfl"
    name = "QB Pressure Stress Test"
    category = "matchup"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if ctx.get("player.position") != "QB" and ctx.get("model.stat") not in (
            "pass_yards", "completions", "passing_touchdowns", "interceptions",
        ):
            return self.insufficient_data("not a passing-relevant market")

        if ctx.get("player.pressure_resistant") is True:
            return self.void("this QB has a track record of maintaining EPA under pressure -- the general edge doesn't apply")

        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("missing opponent/league pressure rate")

        pressure_diff = ctx.get("opponent.def_pressure_rate") - ctx.get("league.avg_pressure_rate")
        # Higher pressure rate against this offense -> bad for passing volume/efficiency -> UNDER lean
        strength = -strength_from_z(pressure_diff / RATE_SPREAD)
        evidence = [
            f"opponent pressure rate {ctx.get('opponent.def_pressure_rate'):.1%} vs league avg "
            f"{ctx.get('league.avg_pressure_rate'):.1%}"
        ]

        confidence = 55.0
        red_flags = []
        if ctx.has("line_ol_dl.team_pass_block_win_rate") and ctx.has("line_ol_dl.opponent_pass_rush_win_rate"):
            block_edge = ctx.get("line_ol_dl.team_pass_block_win_rate") - ctx.get("line_ol_dl.opponent_pass_rush_win_rate")
            strength = (strength + strength_from_z(-block_edge / 0.1)) / 2
            evidence.append(f"pass-block win rate edge {block_edge:+.1%} supports the pressure read")
            confidence += 15.0
        else:
            red_flags.append("no direct pass-block/pass-rush win-rate data -- relying on team-level pressure rate only")

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
