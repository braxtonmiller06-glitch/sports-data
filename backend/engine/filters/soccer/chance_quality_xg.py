"""CHANCE QUALITY / xG BATTLE -- which team creates better chances, not
just more shots?

No free real xG source exists for soccer (see package docstring). This uses
shots-on-target rate (shots on target / total shots) as a PROXY for chance
quality -- a real, API-Sports-available stat, but explicitly not xG. Always
flagged as a proxy in evidence/red_flags so it's never mistaken for the
real thing.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength

CORE_PATHS = ["team.avg_shots", "team.avg_shots_on_target", "opponent.avg_shots", "opponent.avg_shots_on_target"]
SOT_RATE_SPREAD = 0.10


class ChanceQualityXgFilter(Filter, MissingDataMixin):
    filter_id = "soccer_chance_quality_xg"
    sport = "soccer"
    name = "Chance Quality / xG Battle"
    category = "performance"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("missing shots/shots-on-target data for team or opponent")

        team_shots = ctx.get("team.avg_shots")
        team_sot = ctx.get("team.avg_shots_on_target")
        opp_shots = ctx.get("opponent.avg_shots")
        opp_sot = ctx.get("opponent.avg_shots_on_target")
        if team_shots == 0 or opp_shots == 0:
            return self.insufficient_data("zero average shots on record -- likely a data error")

        team_rate = team_sot / team_shots
        opp_rate = opp_sot / opp_shots
        strength = max(-1.0, min(1.0, (team_rate - opp_rate) / SOT_RATE_SPREAD))

        evidence = [
            f"shots-on-target rate (xG proxy, not real xG): team {team_rate:.0%} vs opponent {opp_rate:.0%}",
            f"volume: team {team_shots:.1f} shots/game vs opponent {opp_shots:.1f} shots/game",
        ]
        red_flags = ["shots-on-target rate is a proxy for chance quality, not real xG -- no free xG source is available"]

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
