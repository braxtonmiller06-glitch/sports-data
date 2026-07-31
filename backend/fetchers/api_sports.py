"""Low-level HTTP client for API-Sports products (accessed via RapidAPI).

This module knows nothing about caching, rate limiting, or normalization --
it just makes a request against the correct host for a product and retries
on transient failures. Callers (fetchers/interface.py) are responsible for
reserving quota via rate_limiter before calling request().
"""
import time

import httpx

from backend.config import API_SPORTS_KEY, PRODUCT_HOSTS

MAX_RETRIES = 3
BACKOFF_BASE_SECONDS = 1.5


class ApiSportsError(Exception):
    pass


def request(product: str, path: str, params: dict | None = None) -> dict:
    """GET a path against the given API-Sports product.

    Retries with exponential backoff on network errors, 429 (rate limited by
    the provider itself), and 5xx. Other 4xx errors fail immediately.
    """
    if not API_SPORTS_KEY:
        raise ApiSportsError("API_SPORTS_KEY is not set -- add it to your .env file")

    host = PRODUCT_HOSTS[product]
    url = f"https://{host}{path}"
    headers = {
        "x-rapidapi-key": API_SPORTS_KEY,
        "x-rapidapi-host": host,
    }

    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            response = httpx.get(url, headers=headers, params=params, timeout=10.0)
        except httpx.RequestError as exc:
            last_error = exc
            time.sleep(BACKOFF_BASE_SECONDS * (2**attempt))
            continue

        if response.status_code == 200:
            return response.json()

        if response.status_code == 429 or response.status_code >= 500:
            last_error = ApiSportsError(f"{response.status_code} from {product}{path}")
            time.sleep(BACKOFF_BASE_SECONDS * (2**attempt))
            continue

        raise ApiSportsError(f"API-Sports request failed: {response.status_code} {response.text[:200]}")

    raise ApiSportsError(f"API-Sports request failed after {MAX_RETRIES} retries: {last_error}")
