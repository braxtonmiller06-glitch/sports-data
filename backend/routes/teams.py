from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.fetchers import interface
from backend.schemas import TeamOut

router = APIRouter(prefix="/api/teams", tags=["teams"])


@router.get("", response_model=list[TeamOut])
def list_teams(sport: str = Query(..., description="e.g. nfl, wnba"), db: Session = Depends(get_db)):
    return interface.get_teams(db, sport)
