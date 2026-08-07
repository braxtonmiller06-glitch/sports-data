"""Shared math every filter uses to turn a raw differential into the
bounded [-1, 1] strength and a Signal, so 40+ filters don't each invent
their own thresholds.
"""
import math

from backend.engine.base_filter import Signal

# Strength -> Signal thresholds. Keep symmetric.
_STRONG = 0.6
_LEAN = 0.2


def strength_from_z(z: float, scale: float = 0.35) -> float:
    """Map an unbounded z-score-like differential to a saturating [-1, 1]
    strength via tanh. `scale` controls how quickly it saturates -- larger
    scale means smaller inputs reach the extremes.

    A non-finite input collapses to 0.0 (NEUTRAL). This matters more than it
    looks: min()/max() do not propagate NaN, they compare against it and the
    comparison is always False, so `max(-1, min(1, nan))` returns 1.0 -- the
    strongest possible bullish signal. A NaN from an upstream 0/0 would have
    become a maximum-conviction bet rather than an abstention.
    """
    if not math.isfinite(z):
        return 0.0
    return max(-1.0, min(1.0, math.tanh(z * scale)))


def signal_from_strength(strength: float) -> Signal:
    if not math.isfinite(strength):
        return Signal.NEUTRAL
    if strength >= _STRONG:
        return Signal.STRONG_OVER
    if strength >= _LEAN:
        return Signal.LEAN_OVER
    if strength <= -_STRONG:
        return Signal.STRONG_UNDER
    if strength <= -_LEAN:
        return Signal.LEAN_UNDER
    return Signal.NEUTRAL


def percent_diff(value: float, baseline: float) -> float:
    """Relative difference, guarding against a zero or non-finite baseline."""
    if not baseline or not math.isfinite(baseline) or not math.isfinite(value):
        return 0.0
    return (value - baseline) / baseline
