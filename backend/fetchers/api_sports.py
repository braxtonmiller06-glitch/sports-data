"""Low-level HTTP client for API-Sports products (accessed via RapidAPI).

This module knows nothing about caching, rate limiting, or normalization --
it just makes a request against the correct host for a product and retries
on transient failures. Callers (fetchers/interface.py) are responsible for
reserving quota via rate_limiter before calling request().
"""
import time
from typing import Callable

import httpx

from backend.config import API_SPORTS_KEY, PRODUCT_HOSTS

MAX_RETRIES = 3
BACKOFF_BASE_SECONDS = 1.5


class ApiSportsError(Exception):
    pass


def request(
    product: str,
    path: str,
    params: dict | None = None,
    before_attempt: Callable[[], None] | None = None,
) -> dict:
    """GET a path against the given API-Sports product.

    Retries with exponential backoff on network errors, 429 (rate limited by
    the provider itself), and 5xx. Other 4xx errors fail immediately.

    `before_attempt` runs immediately before each HTTP attempt, including
    retries, and may raise to abort. Callers pass their rate-limit
    reservation here rather than calling it once around this function:
    a retry is a real request that the provider counts, so reserving once
    for up to MAX_RETRIES calls undercounts the daily quota by up to 3x.
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
        if before_attempt is not None:
            before_attempt()

        try:
            response = httpx.get(url, headers=headers, params=params, timeout=10.0)
        except httpx.RequestError as exc:
            last_error = exc
            _backoff(attempt)
            continue

        if response.status_code == 200:
            try:
                return response.json()
            except ValueError as exc:
                # A 200 carrying HTML (a provider error page or a captive
                # portal) would otherwise surface as a bare ValueError from
                # somewhere deep in a normalizer.
                raise ApiSportsError(f"non-JSON 200 response from {product}{path}") from exc

        if response.status_code == 429 or response.status_code >= 500:
            last_error = ApiSportsError(f"{response.status_code} from {product}{path}")
            _backoff(attempt)
            continue

        # The response body is echoed into the exception for the server log.
        # app.py decides whether any of it reaches an HTTP client.
        raise ApiSportsError(f"API-Sports request failed: {response.status_code} {response.text[:200]}")

    raise ApiSportsError(f"API-Sports request failed after {MAX_RETRIES} retries: {last_error}")


def _backoff(attempt: int) -> None:
    """Sleep between attempts -- but not after the final one, which would
    just delay the exception the caller is already going to get."""
    if attempt < MAX_RETRIES - 1:
        time.sleep(BACKOFF_BASE_SECONDS * (2**attempt))
