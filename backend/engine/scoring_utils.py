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
    """
    return max(-1.0, min(1.0, math.tanh(z * scale)))


def signal_from_strength(strength: float) -> Signal:
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
    """Relative difference, guarding against a zero baseline."""
    if baseline == 0:
        return 0.0
    return (value - baseline) / baseline
