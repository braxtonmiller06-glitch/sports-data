"""INJURY / REPLACEMENT IMPACT -- does one absence change the whole structure?
Model the cascade, don't just say "starter OUT = auto over" for the backup.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength

_OWN_STATUS_UNDER = {"doubtful", "out"}


class InjuryReplacementImpactFilter(Filter, MissingDataMixin):
    filter_id = "nfl_injury_replacement_impact"
    sport = "nfl"
    name = "Injury / Replacement Impact"
    category = "risk"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        own_status = ctx.get("player.injury_status", "healthy")
        if own_status in _OWN_STATUS_UNDER:
            return self.void(f"player's own injury status is '{own_status}' -- role itself is in question, not a matchup edge")

        absences = ctx.data.get("key_absences") or []
        if not absences:
            return self.insufficient_data("no relevant teammate absences for this game")

        same_position = [a for a in absences if a.get("position") == ctx.get("player.position")]
        other_position = [a for a in absences if a.get("position") != ctx.get("player.position")]

        evidence = []
        red_flags = []
        strength = 0.0

        if same_position:
            confirmed = [a for a in same_position if a.get("historically_absorbs_role")]
            if confirmed:
                strength = 0.5
                evidence.append(
                    f"{', '.join(a['name'] for a in confirmed)} out at the same position -- history confirms "
                    "this player absorbs the vacated role"
                )
            else:
                red_flags.append(
                    f"{', '.join(a['name'] for a in same_position)} out at the same position, but no history "
                    "confirms this player (rather than another backup) absorbs the role"
                )

        if other_position:
            # e.g. an OL or key blocker out affects the whole unit's structure, not just one player's role.
            evidence.append(
                f"{', '.join(a['name'] for a in other_position)} out at a different position -- "
                "structural/cascade effect, not a direct role handoff"
            )
            red_flags.append("cross-position absence effects are harder to quantify -- treat as informational only")

        if not evidence:
            return self.insufficient_data("absences present but no usable signal for this player's role")

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=50.0 if not red_flags else 30.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
