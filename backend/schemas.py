"""Pydantic response schemas -- the normalized shape the frontend consumes,
identical across every sport regardless of which API-Sports product it came from.
"""
from typing import Optional

from pydantic import BaseModel


class TeamOut(BaseModel):
    id: str
    sport: str
    name: str
    abbreviation: Optional[str] = None
    logo_url: Optional[str] = None
    conference: Optional[str] = None
    division: Optional[str] = None
    record: Optional[str] = None

    model_config = {"from_attributes": True}


class GameOut(BaseModel):
    id: str
    sport: str
    home_team: str
    away_team: str
    date: str
    status: str
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    final_score: Optional[str] = None


class PlayerOut(BaseModel):
    id: str
    sport: str
    name: str
    team_id: Optional[str] = None
    position: Optional[str] = None
    number: Optional[int] = None

    model_config = {"from_attributes": True}


class OddsOut(BaseModel):
    game_id: str
    bookmaker: Optional[str] = None
    moneyline: Optional[dict] = None
    spread: Optional[dict] = None
    total: Optional[dict] = None
    timestamp: Optional[str] = None


class StandingOut(BaseModel):
    sport: str
    team_id: str
    team_name: str
    wins: int
    losses: int
    win_pct: Optional[float] = None
    conference: Optional[str] = None
    division: Optional[str] = None
    rank: Optional[int] = None


class InjuryOut(BaseModel):
    sport: str
    player_id: Optional[str] = None
    player_name: str
    team_id: Optional[str] = None
    team_name: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None


class ProductUsageOut(BaseModel):
    product: str
    date: str
    count: int
    limit: int
    percent_used: float
    warning: bool
    upgrade_recommended: bool


class HealthOut(BaseModel):
    status: str
    database: str
    usage: list[ProductUsageOut]
