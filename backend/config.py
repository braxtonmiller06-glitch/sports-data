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
