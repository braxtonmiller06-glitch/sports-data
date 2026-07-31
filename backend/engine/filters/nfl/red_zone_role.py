"""RED-ZONE ROLE -- who gets the highest-value opportunities?"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

CORE_PATHS = ["player.season_avg.red_zone_touches", "team.red_zone_touches_per_game"]
SHARE_SPREAD = 0.15
RELEVANT_STATS = ("anytime_td", "rushing_touchdowns", "receiving_touchdowns")


class RedZoneRoleFilter(Filter, MissingDataMixin):
    filter_id = "nfl_red_zone_role"
    sport = "nfl"
    name = "Red-Zone Role"
    category = "performance"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if ctx.get("model.stat") not in RELEVANT_STATS:
            return self.insufficient_data("not a touchdown-relevant market")

        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("missing red-zone touch data")

        player_rz = ctx.get("player.season_avg.red_zone_touches")
        team_rz = ctx.get("team.red_zone_touches_per_game")
        if team_rz == 0:
            return self.insufficient_data("team red-zone touch data is zero -- likely a data error")

        share = player_rz / team_rz
        league_avg_share = ctx.get("league.avg_red_zone_share", 0.20)
        strength = strength_from_z((share - league_avg_share) / SHARE_SPREAD)
        evidence = [f"red-zone touch share {share:.0%} vs league avg role share {league_avg_share:.0%}"]

        red_flags = []
        if ctx.data.get("key_absences"):
            replacements = [a for a in ctx.data["key_absences"] if a.get("position") == ctx.get("player.position")]
            if replacements and not any(a.get("historically_absorbs_role") for a in replacements):
                red_flags.append("a teammate at the same position is out, but no history confirms this player absorbs the role")

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
