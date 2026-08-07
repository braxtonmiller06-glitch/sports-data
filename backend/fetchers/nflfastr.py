"""Thin wrapper around nfl_data_py (public nflverse data, free, no key) for
the stats API-Sports doesn't provide: coverage-scheme splits, pressure rate,
defenders in the box, and Next Gen Stats separation/cushion.

Verified against a live pull in this environment: import_weekly_data,
import_pbp_data, import_ngs_data, and import_snap_counts all succeed (they
source from github.com/nflverse/nflverse-data release assets). ONLY
import_schedules is unreachable here (it hits a third-party host,
habitatring.com, not on this sandbox's egress allowlist) -- unused by
anything below.

pbp coverage fields confirmed present with ~93% non-null coverage in the
2023 season: `defense_man_zone_type` ("MAN_COVERAGE"/"ZONE_COVERAGE"),
`defense_coverage_type` (COVER_0..9/2_MAN/etc.), `was_pressure` (bool),
`defenders_in_box` (int).

Downloads are slow (10-20s/season) and network-dependent, so results are
cached in-process per season. Call `warm_cache(years)` once at startup if
you want to avoid a slow first request.
"""
from functools import lru_cache

import pandas as pd

try:
    import nfl_data_py as nfl
except ImportError as exc:  # pragma: no cover
    raise ImportError("nfl_data_py is required for NFL scheme filters -- pip install nfl_data_py") from exc


class NflDataUnavailable(Exception):
    """Raised when nflverse data can't be fetched (network policy, no data for the year, etc.)."""


@lru_cache(maxsize=8)
def _pbp(season: int) -> pd.DataFrame:
    try:
        return nfl.import_pbp_data([season], downcast=True)
    except Exception as exc:
        raise NflDataUnavailable(f"could not load play-by-play data for {season}: {exc}") from exc


@lru_cache(maxsize=8)
def _ngs_receiving(season: int) -> pd.DataFrame:
    try:
        return nfl.import_ngs_data("receiving", [season])
    except Exception as exc:
        raise NflDataUnavailable(f"could not load NGS receiving data for {season}: {exc}") from exc


@lru_cache(maxsize=8)
def _ngs_rushing(season: int) -> pd.DataFrame:
    try:
        return nfl.import_ngs_data("rushing", [season])
    except Exception as exc:
        raise NflDataUnavailable(f"could not load NGS rushing data for {season}: {exc}") from exc


@lru_cache(maxsize=8)
def _snap_counts(season: int) -> pd.DataFrame:
    try:
        return nfl.import_snap_counts([season])
    except Exception as exc:
        raise NflDataUnavailable(f"could not load snap count data for {season}: {exc}") from exc


def warm_cache(years: list[int]) -> None:
    for year in years:
        _pbp(year)
        _ngs_receiving(year)
        _ngs_rushing(year)
        _snap_counts(year)


def qb_coverage_splits(season: int, passer_player_name: str) -> dict | None:
    """EPA/play and completion% for a QB, split by man vs. zone coverage faced."""
    df = _pbp(season)
    plays = df[(df["passer_player_name"] == passer_player_name) & (df["pass_attempt"] == 1)]
    plays = plays[plays["defense_man_zone_type"].isin(["MAN_COVERAGE", "ZONE_COVERAGE"])]
    if plays.empty:
        return None

    out = {}
    for coverage, label in (("MAN_COVERAGE", "vs_man"), ("ZONE_COVERAGE", "vs_zone")):
        subset = plays[plays["defense_man_zone_type"] == coverage]
        if subset.empty:
            continue
        out[label] = {
            "epa_per_play": float(subset["epa"].mean()),
            "completion_pct": float(subset["complete_pass"].mean()),
            "attempts": int(len(subset)),
        }
    return out or None


def team_coverage_rate(season: int, defteam: str) -> dict | None:
    """This defense's man vs. zone coverage rate this season."""
    df = _pbp(season)
    plays = df[(df["defteam"] == defteam) & (df["defense_man_zone_type"].isin(["MAN_COVERAGE", "ZONE_COVERAGE"]))]
    if plays.empty:
        return None
    total = len(plays)
    man_rate = (plays["defense_man_zone_type"] == "MAN_COVERAGE").sum() / total
    return {"man_rate": float(man_rate), "zone_rate": float(1 - man_rate), "plays": int(total)}


def rb_box_and_efficiency(season: int, rusher_player_name: str) -> dict | None:
    """Average defenders in the box faced and yards/carry for a rusher, plus league averages."""
    df = _pbp(season)
    carries = df[(df["rusher_player_name"] == rusher_player_name) & (df["rush_attempt"] == 1)]
    carries = carries.dropna(subset=["defenders_in_box"])
    if carries.empty:
        return None

    league_carries = df[(df["rush_attempt"] == 1)].dropna(subset=["defenders_in_box"])
    return {
        "avg_box": float(carries["defenders_in_box"].mean()),
        "league_avg_box": float(league_carries["defenders_in_box"].mean()),
        "yards_per_carry": float(carries["rushing_yards"].mean()),
        "carries": int(len(carries)),
    }


def receiver_coverage_splits(season: int, receiver_player_name: str) -> dict | None:
    """Target success/air-yards splits by coverage faced, from pbp (not NGS -- NGS
    separation/cushion isn't broken out by coverage type in the public data).
    """
    df = _pbp(season)
    targets = df[(df["receiver_player_name"] == receiver_player_name) & (df["pass_attempt"] == 1)]
    targets = targets[targets["defense_man_zone_type"].isin(["MAN_COVERAGE", "ZONE_COVERAGE"])]
    if targets.empty:
        return None

    out = {}
    for coverage, label in (("MAN_COVERAGE", "vs_man"), ("ZONE_COVERAGE", "vs_zone")):
        subset = targets[targets["defense_man_zone_type"] == coverage]
        if subset.empty:
            continue
        out[label] = {
            "catch_rate": float(subset["complete_pass"].mean()),
            "avg_air_yards": float(subset["air_yards"].mean()),
            "targets": int(len(subset)),
        }
    return out or None


def receiver_season_separation(season: int, player_display_name: str) -> dict | None:
    """Season-level (not coverage-split) separation/cushion from NGS -- supporting
    evidence for the man/zone route filter, not the primary signal.
    """
    df = _ngs_receiving(season)
    rows = df[df["player_display_name"] == player_display_name]
    if rows.empty:
        return None
    row = rows.iloc[-1]  # most recent week on file
    return {
        "avg_separation": float(row["avg_separation"]) if pd.notna(row["avg_separation"]) else None,
        "avg_cushion": float(row["avg_cushion"]) if pd.notna(row["avg_cushion"]) else None,
        "avg_intended_air_yards": float(row["avg_intended_air_yards"])
        if pd.notna(row["avg_intended_air_yards"])
        else None,
    }
