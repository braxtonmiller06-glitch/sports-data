"""SET-PIECE EDGE -- is one team significantly more dangerous from corners/
free kicks? Uses corner differential as a real, API-Sports-available proxy
for set-piece frequency (not set-piece xG specifically, which isn't free).
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength

CORE_PATHS = ["team.avg_corners_for", "opponent.avg_corners_against", "league.avg_corners_per_game"]
CORNER_SPREAD = 2.0


class SetPieceEdgeFilter(Filter, MissingDataMixin):
    filter_id = "soccer_set_piece_edge"
    sport = "soccer"
    name = "Set-Piece Edge"
    category = "matchup"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("missing corner-kick data for team/opponent/league")

        team_corners = ctx.get("team.avg_corners_for")
        opp_allows = ctx.get("opponent.avg_corners_against")
        league_avg = ctx.get("league.avg_corners_per_game")

        expected = (team_corners + opp_allows) / 2
        strength = max(-1.0, min(1.0, (expected - league_avg) / CORNER_SPREAD))
        evidence = [
            f"team averages {team_corners:.1f} corners for, opponent allows {opp_allows:.1f}/game "
            f"(league avg {league_avg:.1f})"
        ]
        red_flags = ["corner volume is a set-piece FREQUENCY proxy, not set-piece xG -- no free xG-by-situation source exists"]

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=40.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
