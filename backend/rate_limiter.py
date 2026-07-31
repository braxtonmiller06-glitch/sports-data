"""Per-product daily rate limiting, backed by the api_usage table.

API-Sports enforces the free-tier 100 req/day limit per product (American
Football, Basketball, Baseball, Football), not globally -- see config.py.
Every outbound call to fetchers/api_sports.py must reserve quota here first.
"""
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.config import (
    DAILY_LIMIT_FREE_TIER,
    PRODUCT_HOSTS,
    UPGRADE_TRIGGER_CONSECUTIVE_DAYS,
    WARNING_THRESHOLD_RATIO,
)
from backend.models import ApiUsage


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
    Call this immediately before making the actual HTTP request.
    """
    today = _today()
    row = db.execute(
        select(ApiUsage).where(ApiUsage.product == product, ApiUsage.date == today)
    ).scalar_one_or_none()
    current = row.count if row else 0

    if current >= DAILY_LIMIT_FREE_TIER:
        raise RateLimitExceeded(product, DAILY_LIMIT_FREE_TIER)

    if row:
        row.count = current + 1
    else:
        row = ApiUsage(product=product, date=today, count=1)
        db.add(row)
    db.commit()

    new_count = current + 1
    if new_count >= DAILY_LIMIT_FREE_TIER * WARNING_THRESHOLD_RATIO:
        print(f"[rate_limiter] WARNING: '{product}' at {new_count}/{DAILY_LIMIT_FREE_TIER} requests today")
    return new_count


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
