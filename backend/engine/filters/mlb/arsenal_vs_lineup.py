"""ARSENAL VS LINEUP -- does the hitter's profile attack the pitcher's
primary weapons? A hitter who destroys the pitcher's most-used pitch is a
stronger signal than raw batting average.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength

MIN_PITCHES_VS_TYPE = 10
WOBA_LEAGUE_AVG = 0.320

# Batter xwOBA vs the pitcher's arsenal correlates *positively* with batter-favorable
# stats (more xwOBA = more hits/total bases) but *negatively* with strikeouts (a batter
# who struggles against the arsenal is a good sign for the pitcher's K prop, not a bad one).
_INVERTED_FOR_STATS = {"strikeouts"}


class ArsenalVsLineupFilter(Filter, MissingDataMixin):
    filter_id = "mlb_arsenal_vs_lineup"
    sport = "mlb"
    name = "Arsenal vs Lineup"
    category = "matchup"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        arsenal = ctx.data.get("statcast", {}).get("pitcher_arsenal")
        batter_vs_pitch = ctx.data.get("statcast", {}).get("batter_vs_primary_pitch")
        if not arsenal:
            return self.insufficient_data("no pitch-arsenal data available for this pitcher")

        dominant_pitch = max(arsenal, key=lambda pt: arsenal[pt]["usage_pct"])
        usage = arsenal[dominant_pitch]["usage_pct"]
        evidence = [f"pitcher throws {dominant_pitch} {usage:.0%} of the time"]

        if not batter_vs_pitch or batter_vs_pitch.get("pitches_seen", 0) < MIN_PITCHES_VS_TYPE:
            return self.insufficient_data(
                f"not enough batter history vs {dominant_pitch} specifically ({(batter_vs_pitch or {}).get('pitches_seen', 0)} pitches)"
            )

        xwoba = batter_vs_pitch.get("xwoba")
        if xwoba is None:
            return self.insufficient_data("batter xwOBA vs this pitch type unavailable")

        direction = -1.0 if ctx.get("model.stat") in _INVERTED_FOR_STATS else 1.0
        diff = xwoba - WOBA_LEAGUE_AVG
        strength = direction * max(-1.0, min(1.0, diff / 0.15))
        evidence.append(
            f"batter's xwOBA vs {dominant_pitch}: {xwoba:.3f} vs league avg {WOBA_LEAGUE_AVG:.3f} "
            f"({batter_vs_pitch['pitches_seen']} pitches seen)"
        )
        if direction < 0:
            evidence.append("inverted for a strikeout market: a batter who struggles here favors the pitcher's K prop")

        red_flags = []
        if usage < 0.30:
            red_flags.append(f"pitcher's primary pitch is only used {usage:.0%} of the time -- a weaker 'dominant weapon' claim")

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=60.0 if usage >= 0.30 else 40.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
