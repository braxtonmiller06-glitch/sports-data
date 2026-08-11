# sports-data

Sports data API for a WNBA/NFL-focused picks site (MLB, MLS, and the top five
European soccer leagues as secondary sports), backed by API-Sports.

## Architecture note: API-Sports is 4 products, not 1

The original plan assumed a single unified API-Sports endpoint/schema. In
practice API-Sports ships a **separate product per sport family**, each with
its own host and its own independent 100 req/day free-tier quota:

| Sport(s) | Product | Host | League ID used here |
|---|---|---|---|
| NFL | American Football | `v1.american-football.api-sports.io` | 1 |
| WNBA | Basketball | `v1.basketball.api-sports.io` | 13 |
| MLB | Baseball | `v1.baseball.api-sports.io` | 1 |
| MLS, EPL, La Liga, Serie A, Bundesliga, Ligue 1 | Football (Soccer) | `v3.football.api-sports.io` | 253 / 39 / 140 / 135 / 78 / 61 |

One RapidAPI key works across all four once you've subscribed to each
product's free tier, but the 100 req/day cap applies **per product** — using
NFL + WNBA + MLB + Football all in one day effectively gives you up to
~400 requests, not 100. `backend/rate_limiter.py` tracks usage per product
accordingly. See `backend/config.py` for the full mapping.

Response field names differ between products (e.g. American Football nests
the game object under `"game"`; Basketball's fields are flat at the top
level). `backend/fetchers/normalize.py` handles this per product. Those
mappings follow API-Sports' documented conventions but weren't byte-verified
against a live response (their docs site blocked automated fetches while
this was built) — spot-check against a real response once you have a key,
and any fix is a one-line change in `normalize.py`, not a redesign.

## Phase 1 scope

Fully implemented (fetch + normalize + persist + cache): **NFL, WNBA**.

Stubbed but routable: MLB, MLS, EPL, La Liga, Serie A, Bundesliga, Ligue 1 —
hitting any endpoint for these returns `501 Not Implemented` with a clear
message. Wiring one up means adding a normalizer in `normalize.py` for its
product (Baseball or Football) and flipping `"implemented": True` in
`config.py`.

## Setup

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cd ..
cp .env.example .env
# edit .env and set API_SPORTS_KEY (free at https://api-sports.io, or
# subscribe to each product's free tier on RapidAPI)

uvicorn backend.app:app --reload
```

The SQLite database (`sports_data.db`) and its tables are created
automatically on startup.

## Endpoints

All responses are JSON.

- `GET /api/games?sport=nfl&date=2026-07-30` — scores, status, final results
- `GET /api/teams?sport=wnba` — team info, logos, records
- `GET /api/odds?sport=nfl&date=2026-07-30` — moneyline, spread, total by bookmaker
- `GET /api/players?sport=wnba&search=clark` — player search (also accepts `team=`)
- `GET /api/standings?sport=nfl&season=2025` — current standings
- `GET /api/injuries?sport=nfl` — active injury reports
- `GET /api/health` — DB status + per-product daily usage, warnings, and upgrade recommendation

`sport` is one of: `nfl`, `wnba`, `mlb`, `mls`, `epl`, `la_liga`, `serie_a`,
`bundesliga`, `ligue_1`.

## Caching

In-process TTL cache in front of every fetch (`backend/cache.py`), so
repeated requests within the window don't touch the daily quota:

| Resource | TTL |
|---|---|
| Games | 5 min |
| Teams | 24 hr |
| Odds | 15 min |
| Players | 1 hr |
| Standings | 1 hr |
| Injuries | 30 min |

Normalized data is also persisted to SQLite (`games`, `teams`, `players`,
`odds` tables) on every successful fetch, independent of the in-memory
cache's lifetime.

## Rate limiting & the $10/month upgrade

`backend/rate_limiter.py` reserves one unit of quota per outbound API call,
tracked per product per day in the `api_usage` table:

- Logs a warning once a product crosses 80/100 requests in a day.
- Returns `429` (with a clear body) once a product hits 100/100 — cached and
  already-persisted data keeps serving; only fresh upstream fetches for that
  product are blocked until the quota resets.
- `GET /api/health` reports `upgrade_recommended: true` for any product that
  has hit its cap on each of the last 3 days — that's the signal it's time
  to move to the $10/month plan (7,500 req/day per product), not a hard
  budget rule to guess at.

## Error handling

Centralized in `backend/app.py` via FastAPI exception handlers:

- Unknown sport → `404`
- Sport not yet implemented (Phase 1 stub) → `501`
- Daily quota exhausted for a product → `429`
- Upstream API-Sports failure after retries (network errors, `429`, `5xx`
  all retry with exponential backoff in `fetchers/api_sports.py`) → `502`

## What's next (Phase 2)

- React frontend consuming these endpoints, with Recharts for standings/odds
  visualization
- Wire up the remaining stubbed sports (Baseball + Football/Soccer normalizers)
- PostgreSQL for production, deployed on Railway
