"""SHOOTING SUSTAINABILITY -- is recent production real or inflated by
unsustainable shooting luck?
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

CORE_PATHS = ["player.season_avg.fg3_pct", "player.last_5_avg.fg3_pct", "player.last_5_avg.fg3a"]
PCT_SPREAD = 0.12  # 12 percentage points of 3P% deviation treated as one "unit"
LOW_VOLUME_ATTEMPTS = 3.0  # per-game 3PA below which a hot streak is highly suspect


class ShootingSustainabilityFilter(Filter, MissingDataMixin):
    filter_id = "wnba_shooting_sustainability"
    sport = "wnba"
    name = "Shooting Sustainability"
    category = "risk"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("missing season or recent 3-point shooting splits")

        season_pct = ctx.get("player.season_avg.fg3_pct")
        last5_pct = ctx.get("player.last_5_avg.fg3_pct")
        last5_attempts = ctx.get("player.last_5_avg.fg3a")

        pct_diff = last5_pct - season_pct
        red_flags = []
        # Inflated recent efficiency on low attempts -> unsustainable -> negative strength
        # (this filter's "strength" means "confidence recent production repeats", not "over/under" directly)
        if pct_diff > PCT_SPREAD and last5_attempts < LOW_VOLUME_ATTEMPTS:
            strength = -strength_from_z(pct_diff / PCT_SPREAD)
            red_flags.append(
                f"3P% jumped from {season_pct:.1%} to {last5_pct:.1%} on only {last5_attempts:.1f} attempts/game "
                "-- small-sample shooting variance, not a real skill change"
            )
        elif pct_diff < -PCT_SPREAD:
            strength = -strength_from_z(abs(pct_diff) / PCT_SPREAD)
            red_flags.append(f"3P% has dropped from {season_pct:.1%} to {last5_pct:.1%} recently")
        else:
            # Recent efficiency roughly matches season baseline -- production is trustworthy,
            # but this filter has nothing extra to add on direction.
            strength = 0.0

        evidence = [f"season 3P% {season_pct:.1%} vs last-5 3P% {last5_pct:.1%} on {last5_attempts:.1f} attempts/game"]

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=60.0 if red_flags else 40.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
