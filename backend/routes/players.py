from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.fetchers import interface
from backend.schemas import PlayerOut

router = APIRouter(prefix="/api/players", tags=["players"])


@router.get("", response_model=list[PlayerOut])
def list_players(
    sport: str = Query(..., description="e.g. nfl, wnba"),
    team: Optional[str] = Query(None, description="API-Sports team id"),
    search: Optional[str] = Query(None, description="Player name search, e.g. clark"),
    db: Session = Depends(get_db),
):
    return interface.get_players(db, sport, team=team, search=search)
