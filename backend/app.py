"""FastAPI app entry point.

Run from the repo root with:
    uvicorn backend.app:app --reload
"""
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.config import CORS_ALLOWED_ORIGINS, DEBUG_ERRORS
from backend.database import get_db, init_db
from backend.fetchers.api_sports import ApiSportsError
from backend.fetchers.interface import SportNotImplemented, UnknownSport
from backend.rate_limiter import RateLimitExceeded, usage_snapshot
from backend.routes import games, injuries, odds, players, standings, teams
from backend.schemas import HealthOut

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Sports Data API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.exception_handler(UnknownSport)
def handle_unknown_sport(request: Request, exc: UnknownSport):
    return JSONResponse(status_code=404, content={"detail": f"Unknown sport '{exc}'"})


@app.exception_handler(SportNotImplemented)
def handle_not_implemented(request: Request, exc: SportNotImplemented):
    return JSONResponse(status_code=501, content={"detail": str(exc)})


@app.exception_handler(RateLimitExceeded)
def handle_rate_limit(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "detail": str(exc),
            "product": exc.product,
            "hint": "Cached data may still be available; try again after midnight UTC or upgrade to the $10/month tier.",
        },
    )


@app.exception_handler(ApiSportsError)
def handle_api_sports_error(request: Request, exc: ApiSportsError):
    # The upstream body can echo the request, and the request carries our
    # RapidAPI key in a header. Log it server-side; send the client a
    # status code and nothing else unless DEBUG_ERRORS is explicitly on.
    log.error("upstream API-Sports error on %s: %s", request.url.path, exc)
    detail = f"Upstream API-Sports error: {exc}" if DEBUG_ERRORS else "Upstream sports data provider is unavailable."
    return JSONResponse(status_code=502, content={"detail": detail})


app.include_router(games.router)
app.include_router(teams.router)
app.include_router(odds.router)
app.include_router(players.router)
app.include_router(standings.router)
app.include_router(injuries.router)


@app.get("/api/health", response_model=HealthOut)
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as exc:  # pragma: no cover - only hit if DB is actually down
        # SQLAlchemy connection errors quote the DSN, which for Postgres means
        # user:password@host. That must not reach an unauthenticated endpoint.
        log.exception("health check database probe failed")
        db_status = f"error: {exc}" if DEBUG_ERRORS else "error"

    return {
        "status": "ok",
        "database": db_status,
        "usage": usage_snapshot(db),
    }
