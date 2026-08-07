"""MATCHUP FIT -- is the opponent structurally bad at defending what this
player wants to do?
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

CORE_PATHS = ["opponent.def_rating", "league.avg_def_rating", "player.season_avg.fga"]
RICH_PATHS = [
    "opponent.rim_defense_rating",
    "opponent.perimeter_defense_rating",
    "player.scoring_zone.paint_pct",
    "player.scoring_zone.three_pct",
]
DEF_RATING_SPREAD = 5.0  # rating points treated as one "unit" of matchup edge


class MatchupFitFilter(Filter, MissingDataMixin):
    filter_id = "wnba_matchup_fit"
    sport = "wnba"
    name = "Matchup Fit"
    category = "matchup"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if ctx.get("player.injury_status") in ("questionable", "minutes_restriction"):
            return self.void("player injury status threatens the expected role/minutes this matchup edge assumes")

        if not self.data_completeness(ctx, CORE_PATHS) == 1.0:
            return self.insufficient_data("missing opponent defensive rating or player shot-volume baseline")

        def_diff = ctx.get("opponent.def_rating") - ctx.get("league.avg_def_rating")
        z = def_diff / DEF_RATING_SPREAD
        strength = strength_from_z(z)
        evidence = [
            f"opponent def rating {ctx.get('opponent.def_rating'):.1f} vs league avg "
            f"{ctx.get('league.avg_def_rating'):.1f} ({'worse' if def_diff > 0 else 'better'} than average defense)"
        ]

        completeness = self.data_completeness(ctx, CORE_PATHS + RICH_PATHS)
        confidence = 55.0
        if ctx.has("opponent.rim_defense_rating") and ctx.has("player.scoring_zone.paint_pct"):
            paint_pct = ctx.get("player.scoring_zone.paint_pct")
            rim_def = ctx.get("opponent.rim_defense_rating")
            league_rim_def = ctx.get("league.avg_def_rating")  # fallback baseline if no rim-specific league avg
            if paint_pct > 0.35 and rim_def > league_rim_def:
                strength = max(strength, strength_from_z((rim_def - league_rim_def) / DEF_RATING_SPREAD))
                evidence.append(f"player draws {paint_pct:.0%} of shots at the rim vs a weak rim-defense opponent")
            confidence += 20.0
        if ctx.has("opponent.perimeter_defense_rating") and ctx.has("player.scoring_zone.three_pct"):
            confidence += 10.0

        red_flags = []
        if not ctx.has("opponent.rim_defense_rating") and not ctx.has("opponent.perimeter_defense_rating"):
            red_flags.append("no zone-level defensive data available -- relying on overall def rating only")

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=self.capped_confidence(confidence, completeness),
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
