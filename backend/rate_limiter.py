"""Per-product daily rate limiting, backed by the api_usage table.

API-Sports enforces the free-tier 100 req/day limit per product (American
Football, Basketball, Baseball, Football), not globally -- see config.py.
Every outbound call to fetchers/api_sports.py must reserve quota here first.

Concurrency: the reservation is a single conditional UPDATE, not a read
followed by a write. Two workers that both see 99 must not both be allowed
to write 100, and under uvicorn's default threadpool (or more than one
worker process) a read-then-write does exactly that.
"""
from datetime import date, timedelta

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.config import (
    DAILY_LIMIT_FREE_TIER,
    PRODUCT_HOSTS,
    UPGRADE_TRIGGER_CONSECUTIVE_DAYS,
    WARNING_THRESHOLD_RATIO,
)
from backend.models import ApiUsage

# A losing race re-reads and retries. Two contenders need at most one extra
# pass each; the bound just stops a pathological loop.
_MAX_RESERVE_ATTEMPTS = 5


class RateLimitExceeded(Exception):
    def __init__(self, product: str, limit: int):
        self.product = product
        self.limit = limit
        super().__init__(f"Daily limit of {limit} requests reached for API-Sports product '{product}'")


def _today() -> str:
    return date.today().isoformat()


def get_usage(db: Session, product: str, day: str | None = None) -> int:
    day = day or _today()
    row = db.execute(
        select(ApiUsage).where(ApiUsage.product == product, ApiUsage.date == day)
    ).scalar_one_or_none()
    return row.count if row else 0


def check_and_increment(db: Session, product: str) -> int:
    """Reserve one request against today's quota for `product`.

    Raises RateLimitExceeded if the product is already at the daily cap.
    Call this immediately before each actual HTTP request -- including each
    retry, since every retry is a real request against the provider's count.
    """
    today = _today()

    for _ in range(_MAX_RESERVE_ATTEMPTS):
        # The limit check lives in the WHERE clause so the check and the
        # increment are one atomic statement. RETURNING hands back the value
        # this statement wrote -- re-reading with a second SELECT would race
        # another worker's increment and report a count that isn't ours.
        result = db.execute(
            update(ApiUsage)
            .where(
                ApiUsage.product == product,
                ApiUsage.date == today,
                ApiUsage.count < DAILY_LIMIT_FREE_TIER,
            )
            .values(count=ApiUsage.count + 1)
            .returning(ApiUsage.count)
        )
        reserved = result.scalar_one_or_none()

        if reserved is not None:
            db.commit()
            if reserved >= DAILY_LIMIT_FREE_TIER * WARNING_THRESHOLD_RATIO:
                print(f"[rate_limiter] WARNING: '{product}' at {reserved}/{DAILY_LIMIT_FREE_TIER} requests today")
            return reserved

        # Nothing updated: either today's row is already at the cap, or it
        # doesn't exist yet. Those need opposite responses, so distinguish
        # them rather than guessing.
        db.rollback()
        existing = db.execute(
            select(ApiUsage).where(ApiUsage.product == product, ApiUsage.date == today)
        ).scalar_one_or_none()

        if existing is not None:
            raise RateLimitExceeded(product, DAILY_LIMIT_FREE_TIER)

        try:
            db.add(ApiUsage(product=product, date=today, count=1))
            db.commit()
            return 1
        except IntegrityError:
            # A concurrent worker created today's row between our SELECT and
            # our INSERT. The unique constraint on (product, date) caught it;
            # loop back round and take the UPDATE path against their row.
            db.rollback()

    raise RateLimitExceeded(product, DAILY_LIMIT_FREE_TIER)


def consecutive_days_at_limit(db: Session, product: str, days: int = UPGRADE_TRIGGER_CONSECUTIVE_DAYS) -> bool:
    """True if `product` hit the daily cap on each of the last `days` days.

    Used as the $10/month upgrade trigger signal.
    """
    for offset in range(days):
        day = (date.today() - timedelta(days=offset)).isoformat()
        if get_usage(db, product, day) < DAILY_LIMIT_FREE_TIER:
            return False
    return True


def usage_snapshot(db: Session) -> list[dict]:
    """Today's usage across every API-Sports product, for /api/health."""
    today = _today()
    snapshot = []
    for product in PRODUCT_HOSTS:
        count = get_usage(db, product, today)
        snapshot.append(
            {
                "product": product,
                "date": today,
                "count": count,
                "limit": DAILY_LIMIT_FREE_TIER,
                "percent_used": round(count / DAILY_LIMIT_FREE_TIER * 100, 1),
                "warning": count >= DAILY_LIMIT_FREE_TIER * WARNING_THRESHOLD_RATIO,
                "upgrade_recommended": consecutive_days_at_limit(db, product),
            }
        )
    return snapshot
