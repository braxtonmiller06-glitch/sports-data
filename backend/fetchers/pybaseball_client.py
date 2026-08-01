"""Thin wrapper around pybaseball (free, no key) for MLB's Statcast-level
filters: pitch arsenal usage, whiff/chase rates, command, and batted-ball
quality that API-Sports doesn't provide on any tier.

IMPORTANT CAVEAT, unlike fetchers/nflfastr.py: pybaseball's two data sources
(baseballsavant.mlb.com, fangraphs.com) are both blocked by this sandbox's
egress policy -- confirmed with live test calls that failed at the proxy
level, not at parse time. That means the column names referenced below
follow Statcast's long-stable, well-documented public pitch-level schema
(pitch_type, release_speed, description, events, zone, launch_speed,
launch_angle, woba_value, type, balls, strikes) from training knowledge,
but were NOT verified against a live response the way nflfastr.py's fields
were. Every function here fails soft (returns None) on a KeyError instead
of crashing, and this module is untested against real pybaseball output --
test against a live pull in an environment that can reach these hosts (e.g.
Railway) before trusting it in production, and fix any column mismatch
inside the one function it affects.
"""
import pandas as pd

try:
    import pybaseball as pb
except ImportError as exc:  # pragma: no cover
    raise ImportError("pybaseball is required for MLB Statcast filters -- pip install pybaseball") from exc

pb.cache.enable()


class PybaseballDataUnavailable(Exception):
    pass


def _safe_pull(fn, *args, **kwargs) -> pd.DataFrame | None:
    try:
        return fn(*args, **kwargs)
    except Exception as exc:
        raise PybaseballDataUnavailable(f"{fn.__name__} failed: {exc}") from exc


def pitcher_pitches(player_id: int, start_dt: str, end_dt: str) -> pd.DataFrame | None:
    df = _safe_pull(pb.statcast_pitcher, start_dt, end_dt, player_id)
    return df if df is not None and not df.empty else None


def batter_pitches(player_id: int, start_dt: str, end_dt: str) -> pd.DataFrame | None:
    df = _safe_pull(pb.statcast_batter, start_dt, end_dt, player_id)
    return df if df is not None and not df.empty else None


def pitcher_arsenal(pitches: pd.DataFrame) -> dict | None:
    """pitch_type -> {usage_pct, avg_velo}."""
    try:
        total = len(pitches)
        if total == 0:
            return None
        out = {}
        for pitch_type, group in pitches.groupby("pitch_type"):
            if not isinstance(pitch_type, str) or not pitch_type:
                continue
            out[pitch_type] = {
                "usage_pct": len(group) / total,
                "avg_velo": float(group["release_speed"].mean()),
            }
        return out or None
    except KeyError:
        return None


def batter_vs_pitch_type(pitches: pd.DataFrame, pitch_type: str) -> dict | None:
    """This batter's whiff rate and estimated wOBA specifically against one pitch type."""
    try:
        subset = pitches[pitches["pitch_type"] == pitch_type]
        if subset.empty:
            return None
        swings = subset[subset["description"].isin(
            ["swinging_strike", "swinging_strike_blocked", "foul", "hit_into_play"]
        )]
        whiffs = subset[subset["description"].isin(["swinging_strike", "swinging_strike_blocked"])]
        whiff_rate = len(whiffs) / len(swings) if len(swings) else None
        xwoba = subset["estimated_woba_using_speedangle"].dropna()
        return {
            "whiff_rate": whiff_rate,
            "xwoba": float(xwoba.mean()) if not xwoba.empty else None,
            "pitches_seen": int(len(subset)),
        }
    except KeyError:
        return None


def pitcher_whiff_profile(pitches: pd.DataFrame) -> dict | None:
    """K-relevant swing-and-miss / chase profile for a pitcher."""
    try:
        total = len(pitches)
        if total == 0:
            return None
        swinging_strikes = pitches["description"].isin(["swinging_strike", "swinging_strike_blocked"]).sum()
        called_strikes = (pitches["description"] == "called_strike").sum()
        out_of_zone = pitches[pitches["zone"] > 9]  # Statcast zones 11-14 are outside the strike zone
        chase_swings = out_of_zone["description"].isin(
            ["swinging_strike", "swinging_strike_blocked", "foul", "hit_into_play"]
        ).sum()
        strikeouts = (pitches["events"] == "strikeout").sum()
        plate_appearances = pitches["events"].notna().sum()
        return {
            "swinging_strike_rate": swinging_strikes / total,
            "csw_rate": (swinging_strikes + called_strikes) / total,
            "chase_rate": (chase_swings / len(out_of_zone)) if len(out_of_zone) else None,
            "k_rate": (strikeouts / plate_appearances) if plate_appearances else None,
            "pitches": int(total),
        }
    except KeyError:
        return None


def pitcher_command(pitches: pd.DataFrame) -> dict | None:
    """Walk rate and zone rate -- how much extra baserunning risk this pitcher carries."""
    try:
        total = len(pitches)
        if total == 0:
            return None
        walks = (pitches["events"] == "walk").sum()
        plate_appearances = pitches["events"].notna().sum()
        in_zone = (pitches["zone"] <= 9).sum()
        return {
            "bb_rate": (walks / plate_appearances) if plate_appearances else None,
            "zone_rate": in_zone / total,
            "pitches": int(total),
        }
    except KeyError:
        return None


def batted_ball_quality(pitches: pd.DataFrame) -> dict | None:
    """Exit velocity / hard-hit / barrel-adjacent quality-of-contact for a batter or pitcher's balls in play."""
    try:
        in_play = pitches[pitches["description"] == "hit_into_play"].dropna(subset=["launch_speed"])
        if in_play.empty:
            return None
        hard_hit = (in_play["launch_speed"] >= 95.0).sum()
        return {
            "avg_exit_velo": float(in_play["launch_speed"].mean()),
            "hard_hit_rate": hard_hit / len(in_play),
            "avg_launch_angle": float(in_play["launch_angle"].mean()) if "launch_angle" in in_play else None,
            "balls_in_play": int(len(in_play)),
        }
    except KeyError:
        return None
