from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.fetchers import interface
from backend.schemas import GameOut

router = APIRouter(prefix="/api/games", tags=["games"])


@router.get("", response_model=list[GameOut])
def list_games(
    sport: str = Query(..., description="e.g. nfl, wnba"),
    date: Optional[str] = Query(None, description="YYYY-MM-DD, defaults to today"),
    db: Session = Depends(get_db),
):
    return interface.get_games(db, sport, date)
