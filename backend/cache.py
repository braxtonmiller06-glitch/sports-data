"""In-process TTL cache for normalized responses, keyed by resource type.

Sits in front of the API-Sports fetchers so repeated requests for the same
sport/date/etc. within the TTL window don't burn daily quota. Not shared
across processes -- fine for a single dev server; swap for Redis if you run
more than one worker in production.
"""
import time
from threading import Lock

from backend.config import CACHE_TTL_SECONDS

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


def clear() -> None:
    with _lock:
        _store.clear()
