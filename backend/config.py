"""App configuration: env vars, sport/product mapping, cache TTLs, rate limits.

Important: API-Sports is not one API. It ships a separate product per sport
family (American Football, Basketball, Baseball, Football/Soccer), each with
its own RapidAPI host and its own independent 100 req/day free-tier quota.
One API key works across all products once you've subscribed to each on
RapidAPI, but "100 requests/day" is per product, not a single global bucket.
"""
import os

from dotenv import load_dotenv

load_dotenv()

API_SPORTS_KEY = os.getenv("API_SPORTS_KEY", "")

# product -> RapidAPI host. This is the rate-limit boundary.
PRODUCT_HOSTS = {
    "american-football": "v1.american-football.api-sports.io",
    "basketball": "v1.basketball.api-sports.io",
    "baseball": "v1.baseball.api-sports.io",
    "football": "v3.football.api-sports.io",
}

# sport -> which product serves it, and the league_id within that product.
# "implemented" gates whether the fetcher/normalizer is wired up (Phase 1
# fully implements NFL + WNBA; the rest are stubbed but routable).
SPORTS = {
    "nfl": {"product": "american-football", "league_id": 1, "implemented": True},
    "wnba": {"product": "basketball", "league_id": 13, "implemented": True},
    "mlb": {"product": "baseball", "league_id": 1, "implemented": False},
    "mls": {"product": "football", "league_id": 253, "implemented": False},
    "epl": {"product": "football", "league_id": 39, "implemented": False},
    "la_liga": {"product": "football", "league_id": 140, "implemented": False},
    "serie_a": {"product": "football", "league_id": 135, "implemented": False},
    "bundesliga": {"product": "football", "league_id": 78, "implemented": False},
    "ligue_1": {"product": "football", "league_id": 61, "implemented": False},
}

DAILY_LIMIT_FREE_TIER = 100
WARNING_THRESHOLD_RATIO = 0.8
UPGRADE_TRIGGER_CONSECUTIVE_DAYS = 3

CACHE_TTL_SECONDS = {
    "games": 5 * 60,
    "teams": 24 * 60 * 60,
    "odds": 15 * 60,
    "players": 60 * 60,
    "standings": 60 * 60,
    "injuries": 30 * 60,
}

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sports_data.db")

# --- Authentication ---------------------------------------------------------
# Supabase signs user JWTs with the project's JWT secret (Settings -> API ->
# JWT Secret). Verifying locally keeps auth to a signature check rather than a
# round trip per request. This is a SECRET: server-side only, never VITE_*.
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# Supabase issues user tokens with aud="authenticated".
SUPABASE_JWT_AUDIENCE = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")

# Defaults to on. Every data route reaches a metered upstream, so an
# unauthenticated API is an open proxy against someone else's quota. Turning
# this off is a local-development convenience and validate_runtime_config()
# refuses to boot a deployment with it off.
AUTH_REQUIRED = os.getenv("AUTH_REQUIRED", "true").lower() not in ("0", "false", "no")

# --- Per-caller rate limiting -----------------------------------------------
# Separate from the API-Sports daily quota above: that one is shared by every
# caller, so on its own it is what an abuser exhausts rather than what stops
# them. 0 disables per-caller limiting.
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))

# Set by the platform (Railway sets RAILWAY_ENVIRONMENT). Used only to decide
# whether unsafe-but-convenient local defaults are tolerable.
IS_DEPLOYED = bool(
    os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("ENVIRONMENT", "").lower() in ("production", "staging")
)


class UnsafeConfiguration(RuntimeError):
    """Raised at startup for a combination that must never reach the internet."""


def validate_runtime_config() -> list[str]:
    """Refuse to boot a deployment configured unsafely; warn locally.

    Every default in this module is already the safe one. What this guards is
    the deploy that overrode a default without meaning to -- the failure mode
    where nothing looks wrong because the app came up fine. On a deployed
    instance these raise; locally they are printed, so development stays
    frictionless without the production path depending on anyone's discipline.

    Returns the list of warnings raised in local mode, for tests.
    """
    problems: list[str] = []

    if not AUTH_REQUIRED:
        problems.append(
            "AUTH_REQUIRED is off: every data route is an open proxy to a metered upstream."
        )
    elif not SUPABASE_JWT_SECRET:
        problems.append(
            "AUTH_REQUIRED is on but SUPABASE_JWT_SECRET is unset: every request will 503."
        )

    if DEBUG_ERRORS:
        problems.append(
            "DEBUG_ERRORS is on: upstream bodies and database DSNs (user:password@host) "
            "would be returned to HTTP clients."
        )

    if "*" in CORS_ALLOWED_ORIGINS:
        problems.append(
            "CORS_ALLOWED_ORIGINS contains '*': any site could read this API through "
            "a visitor's browser."
        )

    if RATE_LIMIT_PER_MINUTE <= 0:
        problems.append(
            "RATE_LIMIT_PER_MINUTE is 0: one caller can exhaust the shared daily quota."
        )

    if problems and IS_DEPLOYED:
        raise UnsafeConfiguration(
            "Refusing to start with this configuration:\n  - " + "\n  - ".join(problems)
        )

    for problem in problems:
        print(f"[config] WARNING (local only, would refuse to start if deployed): {problem}")

    return problems

# Browser origins allowed to call this API, comma-separated. The default is
# local dev only: a wildcard here would let any site on the internet read the
# API through a visitor's browser, and "tighten it later" never happens.
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]

# When false (the default), error responses carry a generic message and the
# detail goes to the server log instead. Upstream error bodies and database
# errors both quote connection strings and keys often enough that echoing
# them to an HTTP client is a credential leak waiting to happen.
DEBUG_ERRORS = os.getenv("DEBUG_ERRORS", "").lower() in ("1", "true", "yes")
