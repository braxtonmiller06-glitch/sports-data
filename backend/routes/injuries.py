from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.fetchers import interface
from backend.schemas import InjuryOut

router = APIRouter(prefix="/api/injuries", tags=["injuries"])


@router.get("", response_model=list[InjuryOut])
def list_injuries(sport: str = Query(..., description="e.g. nfl, wnba"), db: Session = Depends(get_db)):
    return interface.get_injuries(db, sport)
