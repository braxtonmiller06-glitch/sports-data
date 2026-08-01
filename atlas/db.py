"""Supabase client for atlas. No `db` module existed before this task --
this is a minimal wrapper: insert_pick() for loadplays.py, plus
get_picks_without_closing_line()/record_closing_line() for closing_lines.py.
Reads credentials from SUPABASE_URL / SUPABASE_KEY (service-role key, since
this runs as a batch job, not user-facing).
"""
import os

from supabase import Client, create_client

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


def get_picks_without_closing_line() -> list[dict]:
    """All picks that haven't had a closing line recorded yet. Filtered further
    (to the ones actually near game start) by closing_lines.py in Python,
    since the start-time window depends on each pick's sport-specific buffer.
    """
    client = get_client()
    response = client.table("picks").select("*").is_("closing_decimal_odds", "null").execute()
    return response.data


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
