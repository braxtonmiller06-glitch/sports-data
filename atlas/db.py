"""Supabase client for atlas. No `db` module existed before this task --
this is a minimal wrapper, just insert_pick() plus the client accessor
loadplays.py needs. Reads credentials from SUPABASE_URL / SUPABASE_KEY
(service-role key, since this runs as a batch job, not user-facing).
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
