"""The aggregation pipeline: turns a pile of fired filters into a single
verdict and (if warranted) a stake. Steps below are numbered to match the
spec's 13-step pipeline; steps 12-13 (log, learn) are split into this
module's `run()` persistence and the separate learning.py module respectively.
"""
import math
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy.orm import Session

from backend.engine.base_filter import HistoricalAccuracy, PickContext, SevenFieldOutput, Signal
from backend.engine.bet_sizing import DEFAULT_BET_SIZER, BetSizer
from backend.engine.correlation_maps import GROUP_DECAY, causal_group_for
from backend.engine.filters.registry import filters_for
from backend.engine.models import FilterFiring, FilterRecord, PickLog

# Step 4: red flags accumulate a confidence penalty; too many force a veto outright.
RED_FLAG_CONFIDENCE_PENALTY = 0.05  # per red flag
RED_FLAG_CONFIDENCE_FLOOR = 0.5
RED_FLAG_VETO_THRESHOLD = 5

# Step 6: how much a fully-saturated aggregate strength moves probability off 50/50.
MAX_PROB_SWING = 0.45  # strength=+1 -> P=0.95, strength=-1 -> P=0.05

# Step 10: thresholds on confidence-adjusted edge.
VERDICT_THRESHOLDS = [
    (0.10, "BET"),
    (0.06, "PLAYABLE"),
    (0.03, "LEAN"),
]
MIN_INDEPENDENT_SIGNALS = 2.0
DEFAULT_BANKROLL = 1000.0


@dataclass
class AggregationResult:
    sport: str
    market_type: str
    subject: str
    line: Optional[float]
    decimal_odds: float
    fired_filters: list[SevenFieldOutput] = field(default_factory=list)
    voided_filters: list[str] = field(default_factory=list)
    raw_signal_count: int = 0
    independent_signal_count: float = 0.0
    model_probability_over: float = 0.5
    market_probability_over: float = 0.5
    edge: float = 0.0
    side: str = "OVER"
    aggregate_confidence: float = 0.0
    adjusted_edge: float = 0.0
    verdict: str = "PASS"
    stake: Optional[float] = None
    veto_reason: Optional[str] = None
    pick_log_id: Optional[int] = None


def _load_filter_instance(db: Session, cls) -> object:
    """Instantiate a filter class with its persisted weight/accuracy, auto-
    registering a fresh FilterRecord (weight 1.0, no history) on first use.
    """
    record = db.get(FilterRecord, cls.filter_id)
    if record is None:
        record = FilterRecord(
            filter_id=cls.filter_id,
            sport=cls.sport,
            name=cls.name,
            category=cls.category,
            current_weight=1.0,
        )
        db.add(record)
        db.commit()

    lifetime = record.lifetime_correct / record.lifetime_total if record.lifetime_total else None
    last_30 = record.last_30_correct / record.last_30_total if record.last_30_total else None
    return cls(
        current_weight=record.current_weight,
        historical_accuracy=HistoricalAccuracy(lifetime=lifetime, last_30=last_30),
    )


def _implied_probabilities(over_odds: Optional[float], under_odds: Optional[float]) -> tuple[float, bool]:
    """De-vigged P(over) when both sides' odds are known; raw 1/odds otherwise.
    Returns (p_over, was_devigged).
    """
    if over_odds and under_odds and over_odds > 1 and under_odds > 1:
        raw_over = 1.0 / over_odds
        raw_under = 1.0 / under_odds
        overround = raw_over + raw_under
        return raw_over / overround, True
    if over_odds and over_odds > 1:
        return 1.0 / over_odds, False
    return 0.5, False


def run(ctx: PickContext, db: Optional[Session] = None, bet_sizer: BetSizer = DEFAULT_BET_SIZER,
        bankroll: float = DEFAULT_BANKROLL, persist: bool = True) -> AggregationResult:
    sport = ctx.sport

    # Step 1: activate relevant filters (the full sport registry -- every WNBA
    # filter is relevant to every WNBA player-prop pick; sport-specific market
    # filtering happens at the filter level via insufficient_data()).
    filter_classes = filters_for(sport)
    instances = [_load_filter_instance(db, cls) for cls in filter_classes] if db is not None else [
        cls() for cls in filter_classes
    ]

    fired: list[SevenFieldOutput] = []
    voided: list[str] = []
    for instance in instances:
        output = instance.analyze(ctx)
        if output.signal == Signal.VOID:
            voided.append(f"{output.filter_id}: {output.red_flags[0] if output.red_flags else 'kill switch'}")
            continue
        fired.append(output)

    # Step 2: group by category (informational -- exposed on the fired filter list itself
    # via each SevenFieldOutput's filter_id -> category lookup, not re-derived here).

    # Step 3: correlation check. Bucket fired filters by causal group; ungrouped
    # filters are standalone (always count as 1 independent unit).
    groups: dict[str, list[SevenFieldOutput]] = {}
    standalone: list[SevenFieldOutput] = []
    for output in fired:
        group_id = causal_group_for(sport, output.filter_id)
        if group_id:
            groups.setdefault(group_id, []).append(output)
        else:
            standalone.append(output)

    def contribution(o: SevenFieldOutput) -> float:
        return o.strength * o.current_weight * (o.confidence / 100.0)

    raw_score = 0.0
    independent_count = 0.0
    for members in groups.values():
        contributions = [contribution(o) for o in members]
        group_strength = sum(contributions) / len(contributions)
        effective_count = 1 + (len(members) - 1) * GROUP_DECAY
        raw_score += group_strength * effective_count
        independent_count += effective_count
    for output in standalone:
        raw_score += contribution(output)
        independent_count += 1.0

    # Step 4: red-flag check. Accumulate penalty; hard-veto past the threshold.
    all_red_flags = [flag for o in fired for flag in o.red_flags]
    veto_reason = None
    if len(all_red_flags) >= RED_FLAG_VETO_THRESHOLD:
        veto_reason = f"{len(all_red_flags)} red flags across fired filters -- hard veto"
    red_flag_multiplier = max(RED_FLAG_CONFIDENCE_FLOOR, 1.0 - RED_FLAG_CONFIDENCE_PENALTY * len(all_red_flags))

    # Step 5 done above (weighted aggregation into raw_score / independent_count).

    # Step 6: model probability.
    normalized_strength = math.tanh(raw_score / max(independent_count, 1.0))
    model_probability_over = 0.5 + MAX_PROB_SWING * normalized_strength
    model_probability_over = max(0.05, min(0.95, model_probability_over))

    # Step 7: market implied probability (de-vigged when both sides are priced).
    over_odds = ctx.get("market.over_decimal_odds")
    under_odds = ctx.get("market.under_decimal_odds")
    market_probability_over, devigged = _implied_probabilities(over_odds, under_odds)
    if not devigged:
        all_red_flags.append("no two-sided market price available -- implied probability not de-vigged")

    # Step 8: edge (signed on the OVER side; UNDER is exactly complementary).
    edge_over = model_probability_over - market_probability_over
    side = "OVER" if edge_over >= 0 else "UNDER"
    edge = abs(edge_over)

    # Step 9: confidence adjustment.
    if fired:
        weighted_conf_num = sum(o.confidence * abs(o.strength * o.current_weight) for o in fired)
        weighted_conf_den = sum(abs(o.strength * o.current_weight) for o in fired) or 1.0
        base_confidence = weighted_conf_num / weighted_conf_den if weighted_conf_den else 0.0
    else:
        base_confidence = 0.0
    aggregate_confidence = base_confidence * red_flag_multiplier
    adjusted_edge = edge * (aggregate_confidence / 100.0)

    # Step 10: verdict.
    verdict = "PASS"
    if veto_reason is None and independent_count >= MIN_INDEPENDENT_SIGNALS:
        for threshold, label in VERDICT_THRESHOLDS:
            if adjusted_edge >= threshold:
                verdict = label
                break
    elif independent_count < MIN_INDEPENDENT_SIGNALS and veto_reason is None:
        veto_reason = f"only {independent_count:.1f} independent signal(s) fired -- not enough to trust an edge"

    # Step 11: bet sizing (only for verdicts we'd actually risk money on).
    stake = None
    if verdict in ("BET", "PLAYABLE"):
        winning_side_probability = model_probability_over if side == "OVER" else 1 - model_probability_over
        winning_side_odds = over_odds if side == "OVER" else under_odds
        if winning_side_odds:
            stake = bet_sizer.size(winning_side_probability, winning_side_odds, bankroll)
            if stake == 0.0:
                stake = None

    result = AggregationResult(
        sport=sport,
        market_type=ctx.market_type,
        subject=ctx.get("player.name") or ctx.get("team.name") or "unknown",
        line=ctx.get("market.line"),
        decimal_odds=(over_odds if side == "OVER" else under_odds) or 0.0,
        fired_filters=fired,
        voided_filters=voided,
        raw_signal_count=len(fired),
        independent_signal_count=independent_count,
        model_probability_over=model_probability_over,
        market_probability_over=market_probability_over,
        edge=edge,
        side=side,
        aggregate_confidence=aggregate_confidence,
        adjusted_edge=adjusted_edge,
        verdict=verdict,
        stake=stake,
        veto_reason=veto_reason,
    )

    # Step 12: log.
    if persist and db is not None:
        pick_row = PickLog(
            sport=sport,
            market_type=ctx.market_type,
            subject=result.subject,
            line=result.line,
            decimal_odds=result.decimal_odds or 1.0,
            model_probability=model_probability_over if side == "OVER" else 1 - model_probability_over,
            market_probability=market_probability_over if side == "OVER" else 1 - market_probability_over,
            edge=edge,
            confidence=aggregate_confidence,
            raw_signal_count=result.raw_signal_count,
            independent_signal_count=independent_count,
            verdict=verdict,
            stake=stake,
        )
        db.add(pick_row)
        db.commit()
        result.pick_log_id = pick_row.id

        for output in fired:
            db.add(
                FilterFiring(
                    pick_id=pick_row.id,
                    filter_id=output.filter_id,
                    signal=output.signal.value,
                    strength=output.strength,
                    confidence=output.confidence,
                    evidence=output.evidence,
                    red_flags=output.red_flags,
                    causal_group=causal_group_for(sport, output.filter_id),
                    weight_at_time=output.current_weight,
                )
            )
        db.commit()

    return result
