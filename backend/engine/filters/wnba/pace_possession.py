"""PACE & POSSESSION ENVIRONMENT -- will there be enough possessions to
create opportunity?
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

CORE_PATHS = ["team.pace", "opponent.pace", "league.avg_pace"]
PACE_SPREAD = 3.0
DRAG_THRESHOLD = 0.9  # historical combined pace below 90% of expected -> kill switch


class PacePossessionFilter(Filter, MissingDataMixin):
    filter_id = "wnba_pace_possession"
    sport = "wnba"
    name = "Pace & Possession Environment"
    category = "context"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("missing team/opponent/league pace data")

        expected_pace = (ctx.get("team.pace") + ctx.get("opponent.pace")) / 2
        league_avg_pace = ctx.get("league.avg_pace")

        # Kill switch only fires on positive evidence these two teams specifically
        # slow each other down -- absence of that data lowers confidence, not a void.
        historical_combined = ctx.get("matchup_history.avg_combined_pace_last_meetings")
        if historical_combined is not None and historical_combined < expected_pace * DRAG_THRESHOLD:
            return self.void(
                f"these teams have historically played at {historical_combined:.1f} combined pace vs an "
                f"expected {expected_pace:.1f} -- they drag each other into a half-court game"
            )

        z = (expected_pace - league_avg_pace) / PACE_SPREAD
        strength = strength_from_z(z)
        evidence = [f"expected pace {expected_pace:.1f} vs league avg {league_avg_pace:.1f}"]

        confidence = 60.0
        red_flags = []
        if historical_combined is None:
            red_flags.append("no head-to-head pace history available to confirm these teams play up to their season pace")
        else:
            evidence.append(f"head-to-head combined pace history {historical_combined:.1f} supports season-pace projection")
            confidence += 15.0

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=min(confidence, 90.0),
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
