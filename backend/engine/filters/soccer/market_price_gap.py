"""MARKET PRICE / PROBABILITY GAP -- the final filter. Edge = Model
Probability - Market Probability. No edge, no bet, even if every other
filter likes the team.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength

CORE_PATHS = ["market.over_decimal_odds", "market.under_decimal_odds"]


class MarketPriceGapFilter(Filter, MissingDataMixin):
    filter_id = "soccer_market_price_gap"
    sport = "soccer"
    name = "Market Price / Probability Gap"
    category = "price"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("no two-sided market price available to compute an implied probability gap")

        over_odds = ctx.get("market.over_decimal_odds")
        under_odds = ctx.get("market.under_decimal_odds")
        implied_over = 1.0 / over_odds
        implied_under = 1.0 / under_odds
        overround = implied_over + implied_under
        devigged_over = implied_over / overround

        projection = ctx.get("model.projection")
        line = ctx.get("market.line")
        if projection is None or line is None:
            return self.insufficient_data("no model projection to compare against the de-vigged market price")

        # This filter's own read: does the model's directional lean simply match a market
        # that's already efficiently priced (no edge) or genuinely disagree with it?
        model_lean_over = projection > line
        market_favors_over = devigged_over > 0.5
        agrees = model_lean_over == market_favors_over

        strength = (0.3 if model_lean_over else -0.3) if not agrees else 0.0
        evidence = [
            f"de-vigged market implied P(over) = {devigged_over:.1%}",
            f"model projects {projection:.2f} vs line {line:.2f}",
        ]
        red_flags = []
        if agrees:
            red_flags.append("model direction already matches the market -- likely priced in, limited edge from this filter alone")

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=40.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
