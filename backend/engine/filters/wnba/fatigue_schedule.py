"""FATIGUE / SCHEDULE STRESS -- is the player's body likely to affect
performance? If nothing about the schedule stands out, this filter has
nothing to add -- that's the kill switch, not an edge case of it.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

CORE_PATHS = ["schedule.back_to_back", "schedule.rest_days", "schedule.games_last_7_days"]
LEAGUE_AVG_GAMES_PER_7_DAYS = 3.0
GAMES_SPREAD = 1.5


class FatigueScheduleFilter(Filter, MissingDataMixin):
    filter_id = "wnba_fatigue_schedule"
    sport = "wnba"
    name = "Fatigue / Schedule Stress"
    category = "risk"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("missing schedule data (rest days, back-to-back, recent game count)")

        back_to_back = ctx.get("schedule.back_to_back")
        rest_days = ctx.get("schedule.rest_days")
        games_7d = ctx.get("schedule.games_last_7_days")
        travel_miles = ctx.get("schedule.travel_miles", 0.0)

        no_disadvantage = not back_to_back and rest_days >= 2 and games_7d <= LEAGUE_AVG_GAMES_PER_7_DAYS
        if no_disadvantage:
            return self.void("no meaningful rest disadvantage -- normal schedule for this game")

        stress_z = (games_7d - LEAGUE_AVG_GAMES_PER_7_DAYS) / GAMES_SPREAD
        if back_to_back:
            stress_z += 1.0
        if rest_days == 0:
            stress_z += 0.5
        if travel_miles > 1500:
            stress_z += 0.3

        strength = -strength_from_z(stress_z)  # fatigue always pushes toward UNDER, never over
        evidence = [f"{games_7d} games in last 7 days, {rest_days} rest days, back-to-back={back_to_back}"]
        if travel_miles > 1500:
            evidence.append(f"{travel_miles:.0f} miles of travel before this game")

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=60.0,
            evidence=evidence,
            red_flags=[],
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
