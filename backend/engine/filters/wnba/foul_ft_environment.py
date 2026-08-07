"""FOUL & FREE-THROW ENVIRONMENT -- does the matchup create extra scoring
via fouls?
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

CORE_PATHS = ["opponent.foul_rate", "league.avg_foul_rate", "player.season_avg.fta", "player.season_avg.fga"]
FOUL_RATE_SPREAD = 2.0
INTERIOR_PAINT_PCT_THRESHOLD = 0.20


class FoulFtEnvironmentFilter(Filter, MissingDataMixin):
    filter_id = "wnba_foul_ft_environment"
    sport = "wnba"
    name = "Foul & Free-Throw Environment"
    category = "context"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("missing opponent foul rate or player FTA/FGA baseline")

        opponent_foul_rate = ctx.get("opponent.foul_rate")
        league_avg_foul_rate = ctx.get("league.avg_foul_rate")
        foul_rate_elevated = opponent_foul_rate > league_avg_foul_rate

        paint_pct = ctx.get("player.scoring_zone.paint_pct")
        # Kill switch requires *positive* evidence the player is purely perimeter AND the
        # opponent isn't foul-prone -- absence of paint_pct just means we skip that check.
        if paint_pct is not None and paint_pct < INTERIOR_PAINT_PCT_THRESHOLD and not foul_rate_elevated:
            return self.void("player rarely attacks the rim and opponent isn't foul-prone -- no interior pressure pathway")

        fta_rate = ctx.get("player.season_avg.fta") / max(ctx.get("player.season_avg.fga"), 1.0)
        z = ((opponent_foul_rate - league_avg_foul_rate) / FOUL_RATE_SPREAD) + (fta_rate - 0.25) * 2
        strength = strength_from_z(z)

        evidence = [
            f"opponent foul rate {opponent_foul_rate:.1f} vs league avg {league_avg_foul_rate:.1f}",
            f"player FTA/FGA rate {fta_rate:.2f}",
        ]
        red_flags = []
        if not ctx.has("referee.foul_rate_factor"):
            red_flags.append("no referee crew data available -- foul-rate read is based on opponent tendency only")

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
