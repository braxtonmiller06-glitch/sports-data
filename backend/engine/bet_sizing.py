"""Swappable bet-sizing module. Default is fractional Kelly with a hard cap.

Note: the spec's shorthand ("Kelly fraction = edge / decimal_odds") isn't
the actual Kelly criterion -- implementing that as written would over- or
under-size bets depending on the odds. True Kelly is:

    f* = (b*p - q) / b

where b = decimal_odds - 1, p = model probability, q = 1 - p. That's what's
implemented below, then scaled by a fractional multiplier (quarter-Kelly by
default) and hard-capped as a percent of bankroll.
"""
from abc import ABC, abstractmethod


class BetSizer(ABC):
    @abstractmethod
    def size(self, model_probability: float, decimal_odds: float, bankroll: float) -> float:
        """Return a stake in the same currency units as `bankroll`. 0.0 means no bet."""
        ...


class FractionalKellyBetSizer(BetSizer):
    def __init__(self, fraction: float = 0.25, cap_pct: float = 0.03):
        if not 0 < fraction <= 1:
            raise ValueError("fraction must be in (0, 1]")
        if not 0 < cap_pct <= 1:
            raise ValueError("cap_pct must be in (0, 1]")
        self.fraction = fraction
        self.cap_pct = cap_pct

    def size(self, model_probability: float, decimal_odds: float, bankroll: float) -> float:
        if decimal_odds <= 1.0:
            return 0.0

        b = decimal_odds - 1.0
        p = model_probability
        q = 1.0 - p
        full_kelly = (b * p - q) / b

        if full_kelly <= 0:
            return 0.0

        stake_fraction = min(full_kelly * self.fraction, self.cap_pct)
        return bankroll * stake_fraction


DEFAULT_BET_SIZER = FractionalKellyBetSizer()
