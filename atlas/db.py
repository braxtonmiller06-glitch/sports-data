"""Supabase client for atlas. No `db` module existed before this task --
this is a minimal wrapper: insert_pick() for loadplays.py, plus
get_picks_without_closing_line()/record_closing_line() for closing_lines.py.
Reads credentials from SUPABASE_URL / SUPABASE_KEY (service-role key, since
this runs as a batch job, not user-facing).
"""
import os
from datetime import datetime, timedelta, timezone

from supabase import Client, create_client

# PostgREST caps an unbounded select at 1000 rows by default and says nothing
# about it. Asking explicitly means a truncated result is detectable rather
# than silent -- see the warnings in the query helpers below.
_MAX_ROWS = 1000

_client: Client | None = None


class SupabaseNotConfigured(Exception):
    pass


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        if not url or not key:
            raise SupabaseNotConfigured("SUPABASE_URL and SUPABASE_KEY must be set")
        _client = create_client(url, key)
    return _client


def insert_pick(pick: dict) -> dict:
    """Insert one row into the picks table. Raises on any Supabase-side
    error (e.g. a check constraint the caller didn't validate for) --
    callers should validate with loadplays.validate_pick() first so this
    only ever fails on genuinely unexpected errors.
    """
    client = get_client()
    response = client.table("picks").insert(pick).execute()
    if not response.data:
        raise RuntimeError(f"insert_pick returned no data for pick: {pick}")
    return response.data[0]


def get_picks_without_closing_line(horizon_hours: int = 48) -> list[dict]:
    """Picks that haven't had a closing line recorded yet. Filtered further
    (to the ones actually near game start) by closing_lines.py in Python,
    since the start-time window depends on each pick's sport-specific buffer.

    Bounded two ways, because PostgREST silently caps an unbounded select at
    1000 rows: the oldest ungraded picks would quietly stop being considered
    once the table grew past that, and nothing would report it. Restricting
    to the next `horizon_hours` keeps the working set small permanently --
    a pick whose game is three days out is not closing in this run anyway.
    """
    cutoff = (datetime.now(timezone.utc) + timedelta(hours=horizon_hours)).isoformat()
    client = get_client()
    response = (
        client.table("picks")
        .select("*")
        .is_("closing_decimal_odds", "null")
        .lte("settles_at", cutoff)
        .order("settles_at")
        .limit(_MAX_ROWS)
        .execute()
    )
    rows = response.data or []
    if len(rows) >= _MAX_ROWS:
        print(
            f"WARNING: get_picks_without_closing_line hit the {_MAX_ROWS}-row cap -- "
            "some picks were not considered this run"
        )
    return rows


def record_closing_line(pick_id: int, closing_decimal_odds: float, clv_pct: float) -> dict:
    client = get_client()
    response = (
        client.table("picks")
        .update({"closing_decimal_odds": closing_decimal_odds, "clv_pct": clv_pct})
        .eq("id", pick_id)
        .execute()
    )
    if not response.data:
        raise RuntimeError(f"record_closing_line returned no data for pick_id {pick_id}")
    return response.data[0]


def get_ungraded_settled_picks(now_iso: str) -> list[dict]:
    """Picks whose settles_at has passed but that haven't been graded yet.

    Ordered oldest-first and explicitly bounded: without a limit PostgREST
    caps this at 1000 rows in an unspecified order, so a backlog would grade
    an arbitrary slice and leave the same picks ungraded forever.
    """
    client = get_client()
    response = (
        client.table("picks")
        .select("*")
        .eq("graded", False)
        .lte("settles_at", now_iso)
        .order("settles_at")
        .limit(_MAX_ROWS)
        .execute()
    )
    rows = response.data or []
    if len(rows) >= _MAX_ROWS:
        print(
            f"WARNING: get_ungraded_settled_picks hit the {_MAX_ROWS}-row cap -- "
            "run again to grade the remainder"
        )
    return rows


def mark_graded(pick_id: int, result: str, graded_at_iso: str) -> dict:
    client = get_client()
    response = (
        client.table("picks")
        .update({"graded": True, "result": result, "graded_at": graded_at_iso})
        .eq("id", pick_id)
        .execute()
    )
    if not response.data:
        raise RuntimeError(f"mark_graded returned no data for pick_id {pick_id}")
    return response.data[0]
