"""OFFENSIVE LINE VS DEFENSIVE LINE -- the trench-battle mechanism behind
both the pressure and run-fit results. Needs PFF-style win-rate data
API-Sports/nflverse public data don't cleanly expose; degrades gracefully.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

RICH_PATHS = [
    "line_ol_dl.team_pass_block_win_rate",
    "line_ol_dl.opponent_pass_rush_win_rate",
    "line_ol_dl.team_run_block_win_rate",
    "line_ol_dl.opponent_run_stop_win_rate",
]
WIN_RATE_SPREAD = 0.10


class OlVsDlFilter(Filter, MissingDataMixin):
    filter_id = "nfl_ol_vs_dl"
    sport = "nfl"
    name = "Offensive Line vs Defensive Line"
    category = "matchup"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        completeness = self.data_completeness(ctx, RICH_PATHS)
        if completeness == 0.0:
            return self.insufficient_data("no line win-rate data available for this data source")

        evidence = []
        strengths = []

        if ctx.has("line_ol_dl.team_pass_block_win_rate") and ctx.has("line_ol_dl.opponent_pass_rush_win_rate"):
            pass_edge = ctx.get("line_ol_dl.team_pass_block_win_rate") - ctx.get("line_ol_dl.opponent_pass_rush_win_rate")
            strengths.append(strength_from_z(pass_edge / WIN_RATE_SPREAD))
            evidence.append(f"pass-block vs pass-rush win-rate edge: {pass_edge:+.1%}")
        if ctx.has("line_ol_dl.team_run_block_win_rate") and ctx.has("line_ol_dl.opponent_run_stop_win_rate"):
            run_edge = ctx.get("line_ol_dl.team_run_block_win_rate") - ctx.get("line_ol_dl.opponent_run_stop_win_rate")
            strengths.append(strength_from_z(run_edge / WIN_RATE_SPREAD))
            evidence.append(f"run-block vs run-stop win-rate edge: {run_edge:+.1%}")

        if not strengths:
            return self.insufficient_data("partial line data present but not the side relevant to this market")

        strength = sum(strengths) / len(strengths)

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=self.capped_confidence(60.0, completeness),
            evidence=evidence,
            red_flags=[] if completeness == 1.0 else ["only partial line win-rate data available"],
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
