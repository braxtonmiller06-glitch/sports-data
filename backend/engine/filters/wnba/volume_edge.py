"""VOLUME EDGE -- is this projection supported by repeatable opportunity,
not just recent box-score production? Volume outranks recent efficiency.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

# which raw-volume stat backs each market stat
_VOLUME_STAT_FOR = {
    "points": "fga",
    "rebounds": "minutes",  # no rebound-chance data available; minutes is the best proxy
    "assists": "minutes",  # no potential-assist data available; minutes is the best proxy
    "pra": "fga",
}
CORE_PATHS = ["player.season_avg.minutes", "player.last_5_avg.minutes", "model.stat"]
MINUTES_SPREAD = 4.0
FGA_SPREAD = 3.0


class VolumeEdgeFilter(Filter, MissingDataMixin):
    filter_id = "wnba_volume_edge"
    sport = "wnba"
    name = "Volume Edge"
    category = "performance"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("missing season/recent minutes or target market stat")

        stat = ctx.get("model.stat")
        volume_key = _VOLUME_STAT_FOR.get(stat, "minutes")
        season_volume = ctx.get(f"player.season_avg.{volume_key}")
        last5_volume = ctx.get(f"player.last_5_avg.{volume_key}")
        if season_volume is None or last5_volume is None:
            return self.insufficient_data(f"missing {volume_key} data needed to back a '{stat}' volume read")

        spread = FGA_SPREAD if volume_key == "fga" else MINUTES_SPREAD
        strength = strength_from_z((last5_volume - season_volume) / spread)
        evidence = [f"{volume_key}: season avg {season_volume:.1f} -> last 5 avg {last5_volume:.1f}"]

        red_flags = []
        season_pts = ctx.get("player.season_avg.points")
        last5_pts = ctx.get("player.last_5_avg.points")
        season_fga = ctx.get("player.season_avg.fga")
        last5_fga = ctx.get("player.last_5_avg.fga")
        if None not in (season_pts, last5_pts, season_fga, last5_fga) and stat in ("points", "pra"):
            points_up = last5_pts > season_pts * 1.1
            fga_flat = last5_fga <= season_fga * 1.03
            if points_up and fga_flat:
                red_flags.append(
                    "recent scoring increase not matched by shot-volume increase -- may be efficiency-driven, "
                    "not repeatable"
                )
                strength *= 0.5

        confidence = 65.0 if not red_flags else 45.0

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
