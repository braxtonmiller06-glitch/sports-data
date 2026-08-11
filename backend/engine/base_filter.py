"""The 7-field filter output contract and the Filter base class every filter
implements. Nothing in engine/ should construct a filter result any other way.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class Signal(str, Enum):
    STRONG_OVER = "STRONG_OVER"
    LEAN_OVER = "LEAN_OVER"
    NEUTRAL = "NEUTRAL"
    LEAN_UNDER = "LEAN_UNDER"
    STRONG_UNDER = "STRONG_UNDER"
    VOID = "VOID"  # kill switch fired -- excluded from aggregation entirely


@dataclass
class HistoricalAccuracy:
    lifetime: Optional[float] = None  # 0-1, None if no graded history yet
    last_30: Optional[float] = None


@dataclass
class SevenFieldOutput:
    filter_id: str
    signal: Signal
    strength: float  # -1.0 (max under) to +1.0 (max over)
    confidence: float  # 0-100
    evidence: list[str] = field(default_factory=list)
    red_flags: list[str] = field(default_factory=list)
    historical_accuracy: HistoricalAccuracy = field(default_factory=HistoricalAccuracy)
    current_weight: float = 1.0

    def __post_init__(self):
        if not -1.0 <= self.strength <= 1.0:
            raise ValueError(f"{self.filter_id}: strength {self.strength} out of [-1.0, 1.0]")
        if not 0.0 <= self.confidence <= 100.0:
            raise ValueError(f"{self.filter_id}: confidence {self.confidence} out of [0, 100]")
        if self.signal == Signal.VOID and self.strength != 0.0:
            raise ValueError(f"{self.filter_id}: VOID signal must carry strength 0.0")


class PickContext:
    """Grab-bag of everything a filter might need for one pick, with safe
    dotted-path access. Filters must never KeyError on missing data -- they
    should read what's there, note what's missing, and let that drive their
    own confidence down (see MissingDataMixin below).
    """

    def __init__(self, sport: str, market_type: str, data: Optional[dict[str, Any]] = None):
        self.sport = sport
        self.market_type = market_type  # e.g. "player_points_over", "moneyline", "spread"
        self.data = data or {}

    def get(self, path: str, default=None):
        """Dotted-path lookup, e.g. ctx.get('player.season_avg.points')."""
        current: Any = self.data
        for key in path.split("."):
            if not isinstance(current, dict) or key not in current:
                return default
            current = current[key]
        return current if current is not None else default

    def has(self, path: str) -> bool:
        sentinel = object()
        return self.get(path, sentinel) is not sentinel


class MissingDataMixin:
    """Shared helper for computing a data-completeness penalty. A filter
    lists the context paths it ideally wants; whatever fraction is actually
    present caps how confident the filter is allowed to claim to be.
    """

    def data_completeness(self, ctx: PickContext, required_paths: list[str]) -> float:
        if not required_paths:
            return 1.0
        present = sum(1 for p in required_paths if ctx.has(p))
        return present / len(required_paths)

    def capped_confidence(self, raw_confidence: float, completeness: float) -> float:
        """Confidence can never exceed what the available data supports.
        completeness=1.0 -> no cap. completeness=0.0 -> hard-capped near 0.
        """
        return min(raw_confidence, 100.0 * completeness)


class Filter(ABC):
    filter_id: str
    sport: str
    name: str
    category: str  # performance | matchup | context | price | risk

    def __init__(self, current_weight: float = 1.0, historical_accuracy: Optional[HistoricalAccuracy] = None):
        self.current_weight = current_weight
        self.historical_accuracy = historical_accuracy or HistoricalAccuracy()

    @abstractmethod
    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        ...

    def void(self, reason: str) -> SevenFieldOutput:
        """Standard way to report a kill-switch firing."""
        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=Signal.VOID,
            strength=0.0,
            confidence=0.0,
            evidence=[],
            red_flags=[reason],
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )

    def insufficient_data(self, reason: str) -> SevenFieldOutput:
        """Standard way to report NEUTRAL-because-we-don't-know, distinct
        from VOID (kill switch actively fired vs. we simply lack the data).
        Still participates in aggregation, but at strength 0 and low confidence.
        """
        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=Signal.NEUTRAL,
            strength=0.0,
            confidence=15.0,
            evidence=[],
            red_flags=[f"insufficient data: {reason}"],
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
