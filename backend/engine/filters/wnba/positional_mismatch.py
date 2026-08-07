"""POSITIONAL / PHYSICAL MISMATCH -- a size/position matchup the market
isn't fully pricing. Needs player-tracking-level data API-Sports doesn't
provide on the free tier; degrades to insufficient-data unless a caller
supplies the richer fields.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

RICH_PATHS = [
    "player.scoring_zone.paint_pct",
    "opponent.rim_defense_rating",
    "player.season_avg.rebounds",
    "opponent.rebounds_allowed_by_position",
]
RATING_SPREAD = 5.0


class PositionalMismatchFilter(Filter, MissingDataMixin):
    filter_id = "wnba_positional_mismatch"
    sport = "wnba"
    name = "Positional / Physical Mismatch"
    category = "matchup"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if ctx.get("player.likely_shadow_matchup_changed") is True:
            return self.void("expected defensive matchup assignment has changed")

        completeness = self.data_completeness(ctx, RICH_PATHS)
        if completeness < 0.5:
            return self.insufficient_data(
                "no player-tracking-level matchup data available on the current data source "
                "(rim defense by position, rebound rates allowed) -- would need a richer stats feed"
            )

        strength = 0.0
        evidence = []
        if ctx.has("opponent.rebounds_allowed_by_position") and ctx.has("player.season_avg.rebounds"):
            allowed = ctx.get("opponent.rebounds_allowed_by_position")
            player_avg = ctx.get("player.season_avg.rebounds")
            z = (allowed - player_avg) / RATING_SPREAD
            strength = strength_from_z(z)
            evidence.append(
                f"opponent allows {allowed:.1f} rebounds/game to this position vs player's {player_avg:.1f} average"
            )

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=self.capped_confidence(55.0, completeness),
            evidence=evidence,
            red_flags=["partial data: positional mismatch signal is directional only, not fully verified"],
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
