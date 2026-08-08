"""Per-caller request limiting.

Distinct from `rate_limiter.py`, and the distinction matters: that module
protects the *upstream provider's* daily quota and is shared by everyone, so on
its own it is the thing an abuser exhausts rather than the thing that stops
them. This module bounds what any single caller may consume, which is what
keeps one client from spending the whole day's quota in a minute.

Fixed-window counters, held in process. Two consequences worth stating:
uvicorn with more than one worker gives each worker its own window, so the
effective limit multiplies by the worker count; and a restart clears the
counters. Both are acceptable for a single-instance deployment and neither is
acceptable at scale -- swap the store for Redis when there is more than one
instance, keeping this interface.
"""
import time
from threading import Lock

from fastapi import Depends, HTTPException, Request, status

from backend.auth import AuthenticatedUser, require_user
from backend.config import RATE_LIMIT_PER_MINUTE, RATE_LIMIT_WINDOW_SECONDS

_counters: dict[tuple[str, int], int] = {}
_lock = Lock()

# Windows are only reclaimed when the map is written to, so a bound stops an
# unbounded key set (one entry per caller per window) growing forever.
_MAX_TRACKED = 4096


class ClientRateLimitExceeded(HTTPException):
    def __init__(self, retry_after: int):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Slow down and try again shortly.",
            headers={"Retry-After": str(max(1, retry_after))},
        )


def _prune_locked(current_window: int) -> None:
    """Caller must hold _lock. Drop every window that has already closed."""
    stale = [key for key in _counters if key[1] != current_window]
    for key in stale:
        del _counters[key]


def client_key(request: Request) -> str:
    """Who is being limited.

    A verified user id is preferred over an IP: it survives a changing address
    and cannot be spoofed, whereas `X-Forwarded-For` is caller-supplied and is
    only trustworthy when a proxy you control rewrites it. The IP is the
    fallback for unauthenticated routes.
    """
    user = getattr(request.state, "user", None)
    if isinstance(user, AuthenticatedUser):
        return f"user:{user.id}"
    client = request.client
    return f"ip:{client.host if client else 'unknown'}"


def enforce(request: Request) -> None:
    """Count this request against the caller's window, or raise 429."""
    if RATE_LIMIT_PER_MINUTE <= 0:
        return

    now = time.time()
    window = int(now // RATE_LIMIT_WINDOW_SECONDS)
    key = (client_key(request), window)

    with _lock:
        if len(_counters) > _MAX_TRACKED:
            _prune_locked(window)

        count = _counters.get(key, 0) + 1
        _counters[key] = count

    if count > RATE_LIMIT_PER_MINUTE:
        # Seconds until this window closes, so a client retrying on the hint
        # arrives when there is actually budget again.
        elapsed = now - (window * RATE_LIMIT_WINDOW_SECONDS)
        raise ClientRateLimitExceeded(int(RATE_LIMIT_WINDOW_SECONDS - elapsed) + 1)


def rate_limited(
    request: Request,
    user: AuthenticatedUser = Depends(require_user),
) -> AuthenticatedUser:
    """Dependency combining authentication and per-caller limiting.

    Ordering is the point: `require_user` runs first and puts the caller on
    `request.state`, so the limit is keyed on the user id rather than a shared
    NAT address.
    """
    enforce(request)
    return user


def reset_for_tests() -> None:
    """Drop all counters. Test-support only."""
    with _lock:
        _counters.clear()
