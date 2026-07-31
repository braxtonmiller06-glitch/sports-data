"""[SCHEME] MAN VS ZONE ROUTE EDGE -- does this receiver beat the coverage
type he'll see most? Primary signal is real nflverse pbp target splits by
coverage (fetchers/nflfastr.py: receiver_coverage_splits), confirmed
working. Season-level NGS separation/cushion (not coverage-split) is
supporting evidence only, since the public data doesn't break separation
out by coverage type.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

MIN_TARGETS_PER_SPLIT = 15
CATCH_RATE_SPREAD = 0.15
DOMINANT_COVERAGE_THRESHOLD = 0.60


class ManVsZoneRouteFilter(Filter, MissingDataMixin):
    filter_id = "nfl_man_vs_zone_route"
    sport = "nfl"
    name = "Man vs Zone Route Edge"
    category = "matchup"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if ctx.get("model.stat") not in ("receptions", "receiving_yards", "receiving_touchdowns"):
            return self.insufficient_data("not a receiving market")

        receiver_splits = ctx.data.get("scheme", {}).get("receiver_coverage_splits")
        team_rate = ctx.data.get("scheme", {}).get("team_coverage_rate")
        if not receiver_splits or not team_rate:
            return self.insufficient_data("no nflverse coverage-split data available for this receiver/defense")

        man_rate, zone_rate = team_rate["man_rate"], team_rate["zone_rate"]
        if max(man_rate, zone_rate) < DOMINANT_COVERAGE_THRESHOLD:
            return self.void(
                f"opponent defense is balanced (man {man_rate:.0%} / zone {zone_rate:.0%}) -- no dominant coverage to key on"
            )

        dominant_key = "vs_man" if man_rate > zone_rate else "vs_zone"
        other_key = "vs_zone" if dominant_key == "vs_man" else "vs_man"
        dominant = receiver_splits.get(dominant_key)
        if dominant is None or dominant["targets"] < MIN_TARGETS_PER_SPLIT:
            return self.insufficient_data(
                f"receiver has too few targets against {dominant_key.replace('vs_', '')} coverage to trust a split"
            )

        other = receiver_splits.get(other_key)
        baseline_catch_rate = other["catch_rate"] if other else dominant["catch_rate"]
        strength = strength_from_z((dominant["catch_rate"] - baseline_catch_rate) / CATCH_RATE_SPREAD)

        coverage_name = "man" if dominant_key == "vs_man" else "zone"
        evidence = [
            f"opponent plays {coverage_name} coverage {max(man_rate, zone_rate):.0%} of snaps",
            f"catch rate vs {coverage_name}: {dominant['catch_rate']:.0%} ({dominant['targets']} targets) "
            f"vs {baseline_catch_rate:.0%} against the other coverage type",
        ]

        red_flags = []
        separation = ctx.data.get("scheme", {}).get("receiver_season_separation")
        if separation and separation.get("avg_separation") is not None:
            evidence.append(f"season avg separation {separation['avg_separation']:.2f} yds (not coverage-split)")
        else:
            red_flags.append("no NGS separation data available to corroborate the coverage-split read")

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=60.0 if not red_flags else 45.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
