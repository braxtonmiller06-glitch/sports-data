"""EXPECTED VOLUME / SNAP OPPORTUNITY -- will the player actually get enough
opportunities? Don't project production without projecting opportunity.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

_VOLUME_STAT_FOR = {
    "pass_yards": "pass_attempts",
    "rush_yards": "carries",
    "receptions": "targets",
    "receiving_yards": "targets",
    "receiving_touchdowns": "targets",
    "rushing_touchdowns": "carries",
}
SNAP_SPREAD = 8.0  # snap-share percentage points


class ExpectedVolumeFilter(Filter, MissingDataMixin):
    filter_id = "nfl_expected_volume"
    sport = "nfl"
    name = "Expected Volume / Snap Opportunity"
    category = "performance"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        stat = ctx.get("model.stat")
        volume_key = _VOLUME_STAT_FOR.get(stat)
        if volume_key is None:
            return self.insufficient_data(f"no known volume proxy for market stat '{stat}'")

        season_vol = ctx.get(f"player.season_avg.{volume_key}")
        last5_vol = ctx.get(f"player.last_5_avg.{volume_key}")
        season_snaps = ctx.get("player.season_avg.snaps")
        last5_snaps = ctx.get("player.last_5_avg.snaps")
        if None in (season_vol, last5_vol):
            return self.insufficient_data(f"missing season/recent {volume_key} data")

        strength = strength_from_z((last5_vol - season_vol) / max(season_vol * 0.2, 1.0))
        evidence = [f"{volume_key}: season avg {season_vol:.1f} -> last 5 avg {last5_vol:.1f}"]

        red_flags = []
        if season_snaps is not None and last5_snaps is not None:
            snap_diff = last5_snaps - season_snaps
            evidence.append(f"snaps: season avg {season_snaps:.1f} -> last 5 avg {last5_snaps:.1f}")
            snap_strength = strength_from_z(snap_diff / SNAP_SPREAD)
            if (snap_strength > 0.1) != (strength > 0.1) and abs(snap_strength) > 0.2:
                red_flags.append("snap trend and target/carry trend disagree -- role change may not be settled")
            strength = (strength + snap_strength) / 2

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=60.0 if not red_flags else 40.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
