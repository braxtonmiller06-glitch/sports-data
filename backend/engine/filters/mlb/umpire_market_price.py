"""UMPIRE + MARKET + PRICE -- combined only at the final decision layer.
Umpire strike-zone tendencies affect K/walk/total environments; market
price/movement is the final diagnostic: is the model's estimated
probability sufficiently higher than the market's implied probability?

No structured free umpire-tendency data source is available -- this filter
is honest about that and leans on price movement as the primary signal,
same as NFL's market_price.py, with umpire data folded in only when supplied.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength

SIGNIFICANT_MOVE = 0.5
_ZONE_SENSITIVE_STATS = {"strikeouts", "walks_allowed"}


class UmpireMarketPriceFilter(Filter, MissingDataMixin):
    filter_id = "mlb_umpire_market_price"
    sport = "mlb"
    name = "Umpire + Market + Price"
    category = "price"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        has_umpire = ctx.has("umpire.strike_zone_size_factor")
        has_line_move = ctx.get("market.line_open") is not None and ctx.get("market.line_current") is not None

        if not has_umpire and not has_line_move:
            return self.insufficient_data("no umpire tendency data and no line movement to diagnose")

        strength = 0.0
        evidence = []
        red_flags = []

        if has_umpire and ctx.get("model.stat") in _ZONE_SENSITIVE_STATS:
            zone_factor = ctx.get("umpire.strike_zone_size_factor")  # >1.0 = bigger zone = more Ks, fewer walks
            zone_strength = (zone_factor - 1.0) * 2.0
            direction = 1.0 if ctx.get("model.stat") == "strikeouts" else -1.0
            strength += direction * max(-1.0, min(1.0, zone_strength))
            evidence.append(f"umpire strike-zone size factor {zone_factor:.2f} (1.0 = league avg)")
        elif not has_umpire:
            red_flags.append("no umpire tendency data available for this game")

        if has_line_move:
            move = ctx.get("market.line_current") - ctx.get("market.line_open")
            if abs(move) >= SIGNIFICANT_MOVE:
                move_strength = 1.0 if move > 0 else -1.0
                strength = (strength + move_strength) / 2 if strength else move_strength
                evidence.append(f"line moved {ctx.get('market.line_open')} -> {ctx.get('market.line_current')} ({move:+.1f})")
                red_flags.append("line movement reflects market information -- treat as a confirmation/caution check, not standalone")

        if not evidence:
            return self.insufficient_data("umpire data not applicable to this market and no significant line movement")

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=max(-1.0, min(1.0, strength)),
            confidence=35.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
