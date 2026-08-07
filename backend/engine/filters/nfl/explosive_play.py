"""EXPLOSIVE-PLAY PROFILE -- does this matchup create unusually high
big-play potential? Not the same as raw yardage.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

CORE_PATHS = ["opponent.def_explosive_play_rate", "league.avg_explosive_play_rate"]
RATE_SPREAD = 0.03


class ExplosivePlayFilter(Filter, MissingDataMixin):
    filter_id = "nfl_explosive_play"
    sport = "nfl"
    name = "Explosive-Play Profile"
    category = "matchup"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("missing opponent/league explosive-play-allowed rate")

        diff = ctx.get("opponent.def_explosive_play_rate") - ctx.get("league.avg_explosive_play_rate")
        strength = strength_from_z(diff / RATE_SPREAD)
        evidence = [
            f"opponent allows explosive plays at {ctx.get('opponent.def_explosive_play_rate'):.1%} vs league avg "
            f"{ctx.get('league.avg_explosive_play_rate'):.1%}"
        ]

        red_flags = []
        season_yards = ctx.get("player.season_avg.rec_yards") or ctx.get("player.season_avg.rush_yards")
        recs_or_carries = ctx.get("player.season_avg.receptions") or ctx.get("player.season_avg.carries")
        if season_yards and recs_or_carries and recs_or_carries > 0:
            ypa = season_yards / recs_or_carries
            if ypa < 6.0:
                red_flags.append(
                    f"player averages only {ypa:.1f} yards per touch -- explosive-play upside may not translate to this profile"
                )
                strength *= 0.6

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
