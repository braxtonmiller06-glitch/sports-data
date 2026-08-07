"""The learning loop: when a pick is graded, every filter that fired on it
gets its accuracy updated and its weight recomputed.

Weight formula: reward recent accuracy more than lifetime, per spec --
blended_rate = 0.6 * last_30_day_rate + 0.4 * lifetime_rate, then mapped to
a weight centered at 1.0:

    weight = clamp(1.0 + (blended_rate - 0.5) * SENSITIVITY, MIN_WEIGHT, MAX_WEIGHT)

A filter batting exactly 50% (coin flip) keeps weight 1.0. SENSITIVITY=4.0
means a 60%-accurate filter reaches weight 1.4; a 40%-accurate filter drops
to 0.6. Weight is clamped to [0.3, 2.0] so no single filter can dominate or
be zeroed out entirely from a short losing/winning streak.

Before computing that weight, blended_rate is shrunk toward the 0.5 prior in
proportion to sample size (Bayesian shrinkage with PRIOR_STRENGTH pseudo-
observations of a coin flip). Without this, a single graded pick swings a
filter's weight straight to the 2.0/0.3 cap -- one win or loss isn't evidence
of anything yet. As lifetime_total grows, the shrinkage fades and the raw
blended_rate takes over.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.engine.models import FilterFiring, FilterGradeEvent, FilterRecord, PickLog

LAST_30_WINDOW = timedelta(days=30)
SENSITIVITY = 4.0
MIN_WEIGHT = 0.3
MAX_WEIGHT = 2.0
PRIOR_STRENGTH = 10.0  # pseudo-observations of a 50% prior used to shrink small samples

VALID_RESULTS = ("WIN", "LOSS", "PUSH")


class AlreadyGradedError(Exception):
    pass


def _weight_from_blended_rate(rate: float) -> float:
    return max(MIN_WEIGHT, min(MAX_WEIGHT, 1.0 + (rate - 0.5) * SENSITIVITY))


def _shrink_toward_prior(rate: float, sample_size: int) -> float:
    return (rate * sample_size + 0.5 * PRIOR_STRENGTH) / (sample_size + PRIOR_STRENGTH)


def grade_pick(db: Session, pick_id: int, result: str) -> PickLog:
    if result not in VALID_RESULTS:
        raise ValueError(f"result must be one of {VALID_RESULTS}, got {result!r}")

    pick = db.get(PickLog, pick_id)
    if pick is None:
        raise ValueError(f"no pick with id {pick_id}")
    if pick.graded:
        raise AlreadyGradedError(f"pick {pick_id} was already graded as {pick.result}")

    now = datetime.now(timezone.utc)
    pick.graded = True
    pick.result = result
    pick.graded_at = now
    db.commit()

    if result == "PUSH":
        return pick  # pushes don't move any filter's accuracy

    correct = result == "WIN"
    firings = db.execute(select(FilterFiring).where(FilterFiring.pick_id == pick_id)).scalars().all()

    for firing in firings:
        db.add(FilterGradeEvent(filter_id=firing.filter_id, pick_id=pick_id, correct=correct, graded_at=now))
    db.commit()

    touched_filter_ids = {f.filter_id for f in firings}
    for filter_id in touched_filter_ids:
        record = db.get(FilterRecord, filter_id)
        if record is None:
            continue  # shouldn't happen -- aggregator auto-registers filters on first use

        record.lifetime_total += 1
        record.lifetime_correct += 1 if correct else 0
        lifetime_rate = record.lifetime_correct / record.lifetime_total

        window_start = now - LAST_30_WINDOW
        recent_events = db.execute(
            select(FilterGradeEvent).where(
                FilterGradeEvent.filter_id == filter_id,
                FilterGradeEvent.graded_at >= window_start,
            )
        ).scalars().all()
        last_30_total = len(recent_events)
        last_30_correct = sum(1 for e in recent_events if e.correct)
        record.last_30_total = last_30_total
        record.last_30_correct = last_30_correct
        last_30_rate = (last_30_correct / last_30_total) if last_30_total else lifetime_rate

        blended_rate = 0.6 * last_30_rate + 0.4 * lifetime_rate
        shrunk_rate = _shrink_toward_prior(blended_rate, record.lifetime_total)
        record.current_weight = _weight_from_blended_rate(shrunk_rate)

    db.commit()
    return pick
