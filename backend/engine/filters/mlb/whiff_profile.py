"""WHIFF / STRIKEOUT PROFILE -- does the matchup create strikeout opportunity?
Critical for pitcher K props.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

K_RATE_SPREAD = 0.06
CONTACT_THRESHOLD = 0.08  # opposing lineup contact-rate-vs-dominant-pitch edge that overrides the K read


class WhiffProfileFilter(Filter, MissingDataMixin):
    filter_id = "mlb_whiff_profile"
    sport = "mlb"
    name = "Whiff / Strikeout Profile"
    category = "performance"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if ctx.get("model.stat") != "strikeouts":
            return self.insufficient_data("not a strikeout market")

        profile = ctx.data.get("statcast", {}).get("pitcher_whiff_profile")
        if not profile or profile.get("k_rate") is None:
            return self.insufficient_data("no strikeout-profile data available for this pitcher")

        league_k_rate = ctx.get("league.avg_k_rate", 0.22)
        contact_edge = ctx.data.get("opposing_lineup", {}).get("contact_rate_vs_dominant_pitch")
        if contact_edge is not None and contact_edge > CONTACT_THRESHOLD:
            return self.void(
                f"opposing lineup makes contact {contact_edge:.0%} above average against this pitcher's dominant pitch"
            )

        strength = strength_from_z((profile["k_rate"] - league_k_rate) / K_RATE_SPREAD)
        evidence = [
            f"K rate {profile['k_rate']:.1%} vs league avg {league_k_rate:.1%}",
            f"CSW {profile['csw_rate']:.1%}, swinging-strike rate {profile['swinging_strike_rate']:.1%}",
        ]

        red_flags = []
        if profile.get("chase_rate") is not None:
            evidence.append(f"chase rate {profile['chase_rate']:.1%}")
        else:
            red_flags.append("no chase-rate data available")
        if contact_edge is None:
            red_flags.append("no opposing-lineup contact data to confirm/deny the K read")

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=60.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
