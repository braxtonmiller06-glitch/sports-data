"""SQLAlchemy models: persisted, normalized sports data + API usage tracking."""
from sqlalchemy import JSON, Boolean, Column, DateTime, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from backend.database import Base


class Team(Base):
    __tablename__ = "teams"

    id = Column(String, primary_key=True)  # f"{sport}_{api_id}"
    sport = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    abbreviation = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    conference = Column(String, nullable=True)
    division = Column(String, nullable=True)
    wins = Column(Integer, nullable=True)
    losses = Column(Integer, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Game(Base):
    __tablename__ = "games"

    id = Column(String, primary_key=True)  # f"{sport}_{api_id}"
    sport = Column(String, index=True, nullable=False)
    date = Column(String, index=True, nullable=False)  # YYYY-MM-DD
    status = Column(String, nullable=True)
    home_team_id = Column(String, nullable=True)
    home_team_name = Column(String, nullable=True)
    away_team_id = Column(String, nullable=True)
    away_team_name = Column(String, nullable=True)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    final = Column(Boolean, default=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Player(Base):
    __tablename__ = "players"

    id = Column(String, primary_key=True)  # f"{sport}_{api_id}"
    sport = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False, index=True)
    team_id = Column(String, index=True, nullable=True)
    position = Column(String, nullable=True)
    number = Column(Integer, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Odds(Base):
    """One row per (game, bookmaker, fetch). Insert-only -- rows accumulate as
    a time series so line movement isn't lost, rather than being upserted.

    moneyline/spread/total are stored as JSON blobs (value-label -> odd)
    instead of fixed home/away/over/under columns: API-Sports' "value" labels
    vary by sport and bet type (team names, "Home"/"Away", "Over 45.5", etc.),
    so forcing them into typed columns would silently drop data on any label
    that doesn't match a guessed name. This matches the odds shape the
    fetcher already normalizes to (see fetchers/normalize.py).
    """

    __tablename__ = "odds"

    id = Column(Integer, primary_key=True, autoincrement=True)
    game_id = Column(String, index=True, nullable=False)
    bookmaker = Column(String, nullable=True)
    moneyline = Column(JSON, nullable=True)
    spread = Column(JSON, nullable=True)
    total = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class ApiUsage(Base):
    """One row per (product, day). The rate limiter's source of truth."""

    __tablename__ = "api_usage"
    __table_args__ = (UniqueConstraint("product", "date", name="uq_api_usage_product_date"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    product = Column(String, index=True, nullable=False)
    date = Column(String, index=True, nullable=False)  # YYYY-MM-DD
    count = Column(Integer, default=0, nullable=False)
