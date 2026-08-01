"""FIXTURE CONGESTION / FATIGUE -- is one team under significantly
different physical conditions? Critical for European competitions and
multi-competition teams.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

CORE_PATHS = ["schedule.games_last_7_days"]
LEAGUE_AVG_GAMES_7D = 1.2
GAMES_SPREAD = 0.6


class FixtureCongestionFilter(Filter, MissingDataMixin):
    filter_id = "soccer_fixture_congestion"
    sport = "soccer"
    name = "Fixture Congestion / Fatigue"
    category = "risk"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("missing recent fixture count")

        games_7d = ctx.get("schedule.games_last_7_days")
        travel_km = ctx.get("schedule.travel_km", 0.0)

        no_disadvantage = games_7d <= LEAGUE_AVG_GAMES_7D and travel_km < 1000
        if no_disadvantage:
            return self.void("no meaningful fixture-congestion disadvantage for this game")

        stress_z = (games_7d - LEAGUE_AVG_GAMES_7D) / GAMES_SPREAD
        if travel_km > 1000:
            stress_z += 0.4

        strength = -strength_from_z(stress_z)  # congestion always pushes toward UNDER/worse performance
        evidence = [f"{games_7d} games in the last 7 days, {travel_km:.0f} km traveled"]

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=50.0,
            evidence=evidence,
            red_flags=[],
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
