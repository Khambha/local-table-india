"""Supabase client configuration and small async-friendly query helpers."""
import os
from functools import lru_cache
from typing import Any, Dict, List, Optional

from supabase import Client, create_client


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY).")
    # supabase-py owns its HTTP connection pool; the cached client reuses it.
    return create_client(url, key)


def fetch_rows(*, select: str = "*", filters: Optional[Dict[str, Any]] = None,
               limit: Optional[int] = None) -> List[Dict[str, Any]]:
    client = get_supabase()
    page_size = min(limit, 1000) if limit is not None else 1000
    rows: List[Dict[str, Any]] = []
    offset = 0
    while True:
        query = client.table("restaurants").select(select)
        for column, value in (filters or {}).items():
            query = query.eq(column, value)
        query = query.range(offset, offset + page_size - 1)
        response = query.execute()
        page = response.data or []
        rows.extend(page)
        if len(page) < page_size or (limit is not None and len(rows) >= limit):
            break
        offset += page_size
    return rows[:limit] if limit is not None else rows


def mark_closed(restaurant_id: str) -> None:
    get_supabase().table("restaurants").update({"is_legit": False}).eq("id", restaurant_id).execute()
