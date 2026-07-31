"""USAGE & ROLE ELASTICITY -- does the player's role expand when teammates
are missing, and does *this* player historically absorb it (vs. someone else)?
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

USAGE_PCT_SPREAD = 5.0  # usage-percentage points treated as one "unit"


class UsageRoleElasticityFilter(Filter, MissingDataMixin):
    filter_id = "wnba_usage_role_elasticity"
    sport = "wnba"
    name = "Usage & Role Elasticity"
    category = "performance"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        player_name = ctx.get("player.name")
        teammates_out = ctx.data.get("teammates_out") or []

        if not teammates_out:
            return self.insufficient_data("no relevant teammates are out for this game -- filter not applicable")

        diverted_to_someone_else = [
            t for t in teammates_out
            if t.get("primary_usage_beneficiary") is not None and t.get("primary_usage_beneficiary") != player_name
        ]
        if len(diverted_to_someone_else) == len(teammates_out):
            names = ", ".join(t["name"] for t in teammates_out)
            beneficiaries = ", ".join(sorted({t["primary_usage_beneficiary"] for t in diverted_to_someone_else}))
            return self.void(
                f"historical usage from {names} being out has gone to {beneficiaries}, not this player"
            )

        usable = [
            t for t in teammates_out
            if t.get("this_player_usage_with_out") is not None and t.get("this_player_baseline_usage") is not None
        ]
        if not usable:
            return self.insufficient_data("teammates are out but no historical usage-absorption data for this player")

        deltas = [t["this_player_usage_with_out"] - t["this_player_baseline_usage"] for t in usable]
        avg_delta = sum(deltas) / len(deltas)
        strength = strength_from_z(avg_delta / USAGE_PCT_SPREAD)

        evidence = [
            f"with {t['name']} out historically: usage {t['this_player_baseline_usage']:.1f}% -> "
            f"{t['this_player_usage_with_out']:.1f}%"
            for t in usable
        ]
        red_flags = []
        if diverted_to_someone_else:
            red_flags.append(
                f"mixed history: usage from {', '.join(t['name'] for t in diverted_to_someone_else)} "
                "has partly gone elsewhere -- effect may be diluted"
            )
        if len(usable) < 3:
            red_flags.append(f"small sample: only {len(usable)} historical game(s) with this exact absence")

        confidence = 40.0 + min(len(usable), 10) * 4.0
        if diverted_to_someone_else:
            confidence *= 0.7

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=min(confidence, 90.0),
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
