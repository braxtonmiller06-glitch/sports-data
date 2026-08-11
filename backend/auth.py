"""Request authentication for the API.

Every data route requires a Supabase-issued access token. The frontend already
holds one after `supabase.auth.signInWithPassword`, so this is a header away on
the client side; what it buys on the server side is that the API stops being an
open proxy to a metered upstream.

The verification is local: Supabase signs user JWTs with the project's JWT
secret (HS256), so validating one is a signature check rather than a round trip
to the auth server on every request.

Fail-closed is deliberate. If AUTH_REQUIRED is on and no secret is configured,
every request is refused with 503 rather than waved through -- a
misconfiguration that silently disables authentication is the failure mode this
whole module exists to prevent.
"""
import logging
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.config import AUTH_REQUIRED, SUPABASE_JWT_AUDIENCE, SUPABASE_JWT_SECRET

log = logging.getLogger(__name__)

# auto_error=False so a missing header produces our 401 with a WWW-Authenticate
# challenge rather than FastAPI's bare 403.
_bearer = HTTPBearer(auto_error=False)


class AuthenticatedUser:
    """The caller, reduced to what the API actually needs to know."""

    __slots__ = ("id", "email", "role")

    def __init__(self, id: str, email: Optional[str], role: str):
        self.id = id
        self.email = email
        self.role = role

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"AuthenticatedUser(id={self.id!r}, role={self.role!r})"


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def decode_token(token: str) -> dict:
    """Verify and decode a Supabase access token.

    Raises HTTPException(401) on anything that is not a currently-valid token.
    The reason is logged rather than returned: telling an anonymous caller
    whether a token was expired, malformed or wrongly signed is free
    reconnaissance.
    """
    if not SUPABASE_JWT_SECRET:
        # Cannot verify, so cannot admit. See the module docstring.
        log.error("SUPABASE_JWT_SECRET is not set; refusing all authenticated requests")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured on this server.",
        )

    try:
        return jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience=SUPABASE_JWT_AUDIENCE,
            # Supabase omits `iss` on some token versions; the signature plus
            # the audience is what actually binds a token to this project.
            options={"require": ["exp", "sub"], "verify_aud": True},
        )
    except jwt.ExpiredSignatureError:
        log.info("rejected an expired token")
        raise _unauthorized("Token has expired.")
    except jwt.InvalidTokenError as exc:
        log.info("rejected an invalid token: %s", exc)
        raise _unauthorized("Invalid authentication token.")


def require_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> AuthenticatedUser:
    """FastAPI dependency: the caller, or a 401.

    With AUTH_REQUIRED off (local development only) this returns a synthetic
    local user so the API is usable without a Supabase project. That switch
    defaults to on, and `validate_runtime_config` refuses to boot a
    non-local deployment with it off.
    """
    if not AUTH_REQUIRED:
        return AuthenticatedUser(id="local-dev", email=None, role="authenticated")

    if credentials is None or not credentials.credentials:
        raise _unauthorized("Missing bearer token.")

    claims = decode_token(credentials.credentials)

    subject = claims.get("sub")
    if not subject:
        raise _unauthorized("Token is missing a subject.")

    role = claims.get("role", "")
    # An anon-key JWT carries role="anon" and is not a signed-in user. It is a
    # valid token for the project, which is exactly why the role has to be
    # checked separately from the signature.
    if role != "authenticated":
        raise _unauthorized("This endpoint requires a signed-in user.")

    user = AuthenticatedUser(id=subject, email=claims.get("email"), role=role)
    # Stashed so the rate limiter can key on the user rather than the IP.
    request.state.user = user
    return user
