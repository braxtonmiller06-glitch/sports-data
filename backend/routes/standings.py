from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.fetchers import interface
from backend.schemas import StandingOut

router = APIRouter(prefix="/api/standings", tags=["standings"])


@router.get("", response_model=list[StandingOut])
def list_standings(
    sport: str = Query(..., description="e.g. nfl, wnba"),
    season: Optional[str] = Query(None, description="e.g. 2025, defaults to current year"),
    db: Session = Depends(get_db),
):
    return interface.get_standings(db, sport, season=season)
