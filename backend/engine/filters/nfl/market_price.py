"""MARKET INFORMATION / PRICE INTEGRITY -- is the market disagreeing with
the model for a meaningful reason? Line movement as a diagnostic, then the
model decides whether it confirms or contradicts its own read.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength

CORE_PATHS = ["market.line_open", "market.line_current"]
SIGNIFICANT_MOVE = 1.5  # points/units of line movement considered meaningful


class MarketPriceIntegrityFilter(Filter, MissingDataMixin):
    filter_id = "nfl_market_price_integrity"
    sport = "nfl"
    name = "Market Information / Price Integrity"
    category = "price"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("no opening/current line to compare -- can't read market movement")

        move = ctx.get("market.line_current") - ctx.get("market.line_open")
        if abs(move) < SIGNIFICANT_MOVE:
            return self.void("line hasn't moved meaningfully -- no market signal to diagnose")

        # Line moving up means the market now expects MORE of the stat -- that's information,
        # not automatically confirmation: it could reflect news the model already has priced in
        # (agrees) or news the model is missing (the model should defer to the market some).
        direction = 1.0 if move > 0 else -1.0
        strength = direction * min(abs(move) / (SIGNIFICANT_MOVE * 3), 1.0)

        evidence = [f"line moved {ctx.get('market.line_open')} -> {ctx.get('market.line_current')} ({move:+.1f})"]
        red_flags = [
            "line movement is a signal the market has information -- treat this filter as a caution/confirmation "
            "check on the aggregate verdict, not a standalone reason to bet"
        ]

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=35.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
