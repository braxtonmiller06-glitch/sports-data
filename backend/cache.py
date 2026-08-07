"""In-process TTL cache for normalized responses, keyed by resource type.

Sits in front of the API-Sports fetchers so repeated requests for the same
sport/date/etc. within the TTL window don't burn daily quota. Not shared
across processes -- fine for a single dev server; swap for Redis if you run
more than one worker in production.

Bounded on purpose. Entries are only reclaimed when something reads them,
so a key that is written once and never read again (yesterday's date, a
one-off player search) would otherwise sit in memory until the process
restarts. Over a season of daily-dated keys that is a slow leak.
"""
import time
from threading import Lock

from backend.config import CACHE_TTL_SECONDS

# Generous next to the real working set -- a day's games/odds/teams across
# nine sports is dozens of keys, not thousands. This is a backstop against
# unbounded growth, not a tuning knob.
MAX_ENTRIES = 512

_store: dict[str, tuple[float, object]] = {}
_lock = Lock()


def make_key(resource: str, **params) -> str:
    parts = ":".join(f"{k}={v}" for k, v in sorted(params.items()) if v is not None)
    return f"{resource}:{parts}"


def get(key: str):
    with _lock:
        entry = _store.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if time.time() >= expires_at:
            del _store[key]
            return None
        return value


def set(key: str, resource: str, value) -> None:
    ttl = CACHE_TTL_SECONDS.get(resource, 60)
    with _lock:
        _store[key] = (time.time() + ttl, value)
        if len(_store) > MAX_ENTRIES:
            _evict_locked()


def _evict_locked() -> None:
    """Caller must hold _lock.

    Drop everything already expired first -- that is pure reclamation and
    costs nothing in hit rate. Only if that isn't enough do we evict live
    entries, oldest expiry first (dicts preserve insertion order, but expiry
    is what actually orders usefulness here since TTLs differ by resource).
    """
    now = time.time()
    for key in [k for k, (expires_at, _) in _store.items() if now >= expires_at]:
        del _store[key]

    if len(_store) <= MAX_ENTRIES:
        return

    for key in sorted(_store, key=lambda k: _store[k][0])[: len(_store) - MAX_ENTRIES]:
        del _store[key]


def clear() -> None:
    with _lock:
        _store.clear()
