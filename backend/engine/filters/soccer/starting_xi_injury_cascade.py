"""STARTING XI / INJURY CASCADE -- does one absence create multiple
downstream problems? Models the cascade using each absence's own season
output rather than a flat "star out = -X" assumption.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength

KEY_ATTACKING_ROLES = {"FW", "AM", "W"}
KEY_DEFENSIVE_ROLES = {"CB", "FB", "GK"}


class StartingXiInjuryCascadeFilter(Filter, MissingDataMixin):
    filter_id = "soccer_starting_xi_injury_cascade"
    sport = "soccer"
    name = "Starting XI / Injury Cascade"
    category = "risk"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        absences = ctx.data.get("key_absences") or []
        if not absences:
            return self.insufficient_data("no relevant starting-XI absences for this game")

        evidence = []
        red_flags = []
        strength = 0.0
        attacking_out = 0
        defensive_out = 0

        for absence in absences:
            role = absence.get("position", "")
            goals = absence.get("season_goals", 0) or 0
            assists = absence.get("season_assists", 0) or 0
            confirmed = absence.get("historically_absorbs_role")

            if role in KEY_ATTACKING_ROLES:
                attacking_out += 1
                if goals + assists >= 5:
                    strength -= 0.3
                    evidence.append(f"{absence['name']} ({role}) out -- {goals}G/{assists}A this season, no confirmed like-for-like replacement")
            elif role in KEY_DEFENSIVE_ROLES:
                defensive_out += 1
                strength += 0.2
                evidence.append(f"{absence['name']} ({role}) out -- defensive structure disrupted")

            if confirmed is False:
                red_flags.append(f"replacement for {absence['name']} has no confirmed track record absorbing this role")

        if not evidence:
            return self.insufficient_data("absences present but none in a role this filter can score confidently")

        if attacking_out and defensive_out:
            red_flags.append("both attacking and defensive absences present -- cascade effects may partially offset")

        strength = max(-1.0, min(1.0, strength))

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=45.0 if not red_flags else 30.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
