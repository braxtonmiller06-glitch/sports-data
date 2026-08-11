"""[SCHEME] RB RUN FIT VS BOX & O-LINE -- is the RB's production driven by
the line/box, or by the back himself? Backed by real nflverse pbp
`defenders_in_box` data (fetchers/nflfastr.py: rb_box_and_efficiency),
confirmed working in this environment.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength

LIGHT_BOX_THRESHOLD = -0.4  # defenders below league avg box to call it "light"
HEAVY_BOX_THRESHOLD = 0.4


class RbRunFitFilter(Filter, MissingDataMixin):
    filter_id = "nfl_rb_run_fit"
    sport = "nfl"
    name = "RB Run Fit vs Box & O-Line"
    category = "matchup"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if ctx.get("model.stat") not in ("rush_yards", "rushing_touchdowns", "carries"):
            return self.insufficient_data("not a rushing market")

        box_data = ctx.data.get("scheme", {}).get("rb_box_efficiency")
        if not box_data:
            return self.insufficient_data("no nflverse box-count data available for this RB")

        if box_data["carries"] < 20:
            return self.void(f"only {box_data['carries']} charted carries this season -- sample too small to trust")

        box_diff = box_data["avg_box"] - box_data["league_avg_box"]
        light_box = box_diff <= LIGHT_BOX_THRESHOLD
        heavy_box = box_diff >= HEAVY_BOX_THRESHOLD

        evidence = [
            f"faces {box_data['avg_box']:.2f} defenders in the box on average vs league avg "
            f"{box_data['league_avg_box']:.2f} ({box_diff:+.2f})",
            f"{box_data['yards_per_carry']:.2f} yards/carry over {box_data['carries']} charted carries",
        ]

        if light_box:
            strength = min(0.4 + abs(box_diff) * 0.5, 1.0)
            evidence.append("light box = volume + efficiency spot, separate from pure runner skill")
        elif heavy_box:
            strength = -min(0.4 + abs(box_diff) * 0.5, 1.0)
            evidence.append("stacked box suggests current efficiency is coming from the back himself, not scheme")
        else:
            strength = 0.0

        red_flags = []
        game_script_stat = ctx.get("model.stat")
        spread = ctx.get("game.spread")
        if spread is not None and spread < -7 and game_script_stat in ("rush_yards", "carries"):
            red_flags.append("team is a significant underdog -- blowout risk could cut into rushing volume regardless of box counts")

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=60.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
