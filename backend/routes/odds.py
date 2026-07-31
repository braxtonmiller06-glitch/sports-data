from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.fetchers import interface
from backend.schemas import OddsOut

router = APIRouter(prefix="/api/odds", tags=["odds"])


@router.get("", response_model=list[OddsOut])
def list_odds(
    sport: str = Query(..., description="e.g. nfl, wnba"),
    date: Optional[str] = Query(None, description="YYYY-MM-DD, defaults to today"),
    db: Session = Depends(get_db),
):
    return interface.get_odds(db, sport, date)
