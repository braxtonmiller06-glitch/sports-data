"""Persistence for the analysis engine: filter accuracy/weight records, the
pick log, and the per-filter firings behind each pick (so learning.py can
later join firings -> graded result -> update the fired filters' records).
"""
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.sql import func

from backend.database import Base


class FilterRecord(Base):
    """One row per filter_id. The learning loop's source of truth for
    accuracy and the weight applied at aggregation time.
    """

    __tablename__ = "engine_filter_records"

    filter_id = Column(String, primary_key=True)
    sport = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # performance | matchup | context | price | risk
    lifetime_correct = Column(Integer, default=0, nullable=False)
    lifetime_total = Column(Integer, default=0, nullable=False)
    last_30_correct = Column(Integer, default=0, nullable=False)
    last_30_total = Column(Integer, default=0, nullable=False)
    current_weight = Column(Float, default=1.0, nullable=False)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PickLog(Base):
    """One row per evaluated pick, whether or not it cleared the bet threshold."""

    __tablename__ = "engine_pick_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sport = Column(String, index=True, nullable=False)
    market_type = Column(String, nullable=False)  # e.g. "player_points_over", "moneyline", "spread"
    subject = Column(String, nullable=False)  # player or team description
    line = Column(Float, nullable=True)  # prop line / spread number; null for moneyline
    decimal_odds = Column(Float, nullable=False)
    model_probability = Column(Float, nullable=False)
    market_probability = Column(Float, nullable=False)
    edge = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)  # 0-100, post confidence-adjustment
    raw_signal_count = Column(Integer, nullable=False)
    independent_signal_count = Column(Float, nullable=False)
    verdict = Column(String, nullable=False)  # PASS | LEAN | PLAYABLE | BET
    stake = Column(Float, nullable=True)  # null when verdict is PASS
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    graded = Column(Boolean, default=False, nullable=False)
    result = Column(String, nullable=True)  # WIN | LOSS | PUSH
    graded_at = Column(DateTime(timezone=True), nullable=True)


class FilterFiring(Base):
    """One row per filter that fired (non-VOID) on a given pick. Links a
    pick's graded result back to every filter that contributed to it.
    """

    __tablename__ = "engine_filter_firings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pick_id = Column(Integer, ForeignKey("engine_pick_log.id"), index=True, nullable=False)
    filter_id = Column(String, ForeignKey("engine_filter_records.filter_id"), index=True, nullable=False)
    signal = Column(String, nullable=False)
    strength = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    evidence = Column(JSON, nullable=True)
    red_flags = Column(JSON, nullable=True)
    causal_group = Column(String, nullable=True)
    weight_at_time = Column(Float, nullable=False)


class FilterGradeEvent(Base):
    """One row per (filter, graded pick). "Last 30" in FilterRecord means
    last 30 *days*, which a simple running counter can't represent (it never
    decays) -- so last_30_correct/last_30_total are recomputed from this
    event history filtered to the trailing 30-day window, while lifetime
    counters stay a simple running total.
    """

    __tablename__ = "engine_filter_grade_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    filter_id = Column(String, ForeignKey("engine_filter_records.filter_id"), index=True, nullable=False)
    pick_id = Column(Integer, ForeignKey("engine_pick_log.id"), nullable=False)
    correct = Column(Boolean, nullable=False)
    graded_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
