"""COVERAGE MATCHUP -- can the offense create separation against this
coverage unit, at the team/scheme level? (Player-specific man/zone edge is
handled separately by the scheme filter man_vs_zone_route.py.)
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

CORE_PATHS = ["opponent.def_pass_epa_allowed", "league.avg_pass_epa"]
EPA_SPREAD = 0.15


class CoverageMatchupFilter(Filter, MissingDataMixin):
    filter_id = "nfl_coverage_matchup"
    sport = "nfl"
    name = "Coverage Matchup"
    category = "matchup"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if ctx.get("model.stat") not in ("pass_yards", "receptions", "receiving_yards", "receiving_touchdowns"):
            return self.insufficient_data("not a passing-game market")

        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("missing opponent/league pass-defense EPA")

        epa_diff = ctx.get("opponent.def_pass_epa_allowed") - ctx.get("league.avg_pass_epa")
        strength = strength_from_z(epa_diff / EPA_SPREAD)
        evidence = [
            f"opponent allows {ctx.get('opponent.def_pass_epa_allowed'):+.3f} pass EPA/play vs league avg "
            f"{ctx.get('league.avg_pass_epa'):+.3f}"
        ]

        red_flags = []
        team_rate = ctx.data.get("scheme", {}).get("team_coverage_rate")
        if team_rate:
            evidence.append(f"defense plays man {team_rate['man_rate']:.0%} / zone {team_rate['zone_rate']:.0%}")
        else:
            red_flags.append("no man/zone rate breakdown available for this defense -- overall EPA read only")

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=55.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
