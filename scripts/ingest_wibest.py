"""Fetch and sync public restaurant data from WiBest.

Supabase SQL (run once in the SQL Editor):
------------------------------------------------------------
create table if not exists public.restaurants (
  id text primary key,
  name text not null,
  city text not null,
  state text not null,
  cuisine text[] not null default '{}',
  rating double precision,
  reviews integer not null default 0,
  is_legit boolean not null default true,
  last_checked timestamptz not null default now()
);
create index if not exists restaurants_city_rating_idx
  on public.restaurants (city, rating desc);
create index if not exists restaurants_state_city_idx
  on public.restaurants (state, city);
------------------------------------------------------------

The public WIB Open Data endpoint is the default source. Its published restaurant
records currently contain name, city, cuisines, rating, budget, address and
vegetarian status, but no state or review count. We map known cities to states
and store reviews as zero rather than inventing a count. WIB data is CC-BY 4.0;
attribute https://wibest.in/data/ when redistributing it.
"""
import asyncio
import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List
from urllib.parse import urljoin, urlparse

import httpx
import pandas as pd
from bs4 import BeautifulSoup
from supabase import create_client

BASE_URL = "https://wibest.in"
JSON_ENDPOINT = os.getenv("WIBEST_JSON_URL", "https://wibest.in/data/json/restaurants.json")
MAX_PAGES = int(os.getenv("WIBEST_MAX_PAGES", "40"))
PAGE_CONCURRENCY = int(os.getenv("WIBEST_CONCURRENCY", "8"))
CITY_STATES_PATH = Path(__file__).with_name("city_states.json")
with CITY_STATES_PATH.open(encoding="utf-8") as states_file:
    CITY_STATES = {city.casefold(): state for city, state in json.load(states_file).items()}


def _as_list(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        return [v.strip() for v in re.split(r"[,;|]", value) if v.strip()]
    return []


def _flatten_jsonld(value: Any) -> Iterable[dict]:
    if isinstance(value, list):
        for child in value:
            yield from _flatten_jsonld(child)
    elif isinstance(value, dict):
        if "@graph" in value:
            yield from _flatten_jsonld(value["@graph"])
        kind = value.get("@type", "")
        if "Restaurant" in (kind if isinstance(kind, str) else " ".join(kind)):
            yield value
        for key in ("itemListElement", "items"):
            if key in value:
                yield from _flatten_jsonld(value[key])


def _normalize(item: dict) -> dict:
    address = item.get("address") or {}
    if isinstance(address, str):
        address = {"streetAddress": address}
    city = item.get("city") or address.get("addressLocality") or item.get("addressLocality")
    state = item.get("state") or address.get("addressRegion") or item.get("addressRegion") or CITY_STATES.get(str(city).casefold())
    name = item.get("name") or item.get("title")
    if not name or not city or not state:
        return {}
    raw_id = item.get("id") or item.get("url") or f"{city}|{name}"
    rid = hashlib.sha256(str(raw_id).encode("utf-8")).hexdigest()[:32]
    rating_obj = item.get("aggregateRating") or {}
    rating = item.get("rating") or rating_obj.get("ratingValue")
    reviews = item.get("reviews") or item.get("reviewCount") or rating_obj.get("reviewCount") or 0
    try:
        rating = float(rating) if rating not in (None, "") else None
    except (TypeError, ValueError):
        rating = None
    try:
        reviews = int(float(reviews))
    except (TypeError, ValueError):
        reviews = 0
    cuisine = _as_list(item.get("cuisines") or item.get("cuisine") or item.get("servesCuisine"))
    return {"id": rid, "name": str(name).strip(), "city": str(city).strip(),
            "state": str(state).strip(), "cuisine": cuisine,
            "rating": rating, "reviews": max(0, reviews), "is_legit": True,
            "last_checked": datetime.now(timezone.utc).isoformat()}


async def _get_json_endpoint(client: httpx.AsyncClient) -> List[dict]:
    if not JSON_ENDPOINT:
        return []
    response = await client.get(JSON_ENDPOINT)
    response.raise_for_status()
    data = response.json()
    if isinstance(data, dict):
        data = data.get("results") or data.get("restaurants") or data.get("data") or []
    return [row for row in data if isinstance(row, dict)] if isinstance(data, list) else []


async def _page(client: httpx.AsyncClient, url: str) -> tuple[List[dict], List[str]]:
    try:
        response = await client.get(url)
        response.raise_for_status()
    except httpx.HTTPError:
        return [], []
    soup = BeautifulSoup(response.text, "html.parser")
    found = []
    for script in soup.select('script[type="application/ld+json"]'):
        try:
            parsed = json.loads(script.string or script.get_text())
            found.extend(_flatten_jsonld(parsed))
        except (json.JSONDecodeError, TypeError):
            continue
    links = []
    for a in soup.select("a[href]"):
        href = urljoin(url, a.get("href", "")).split("#", 1)[0]
        parsed = urlparse(href)
        if parsed.netloc == urlparse(BASE_URL).netloc and href.startswith(BASE_URL) and href not in (url, BASE_URL + "/"):
            links.append(href.rstrip("/"))
    return found, links


async def extract() -> pd.DataFrame:
    headers = {"User-Agent": "Mozilla/5.0 (compatible; IndiaFoodIndex/1.0; +https://wibest.in)"}
    async with httpx.AsyncClient(timeout=25, follow_redirects=True, headers=headers) as client:
        records = await _get_json_endpoint(client)
        if not records:
            queue, visited, sem = [BASE_URL], set(), asyncio.Semaphore(PAGE_CONCURRENCY)
            while queue and len(visited) < MAX_PAGES:
                batch = []
                while queue and len(batch) < PAGE_CONCURRENCY and len(visited) + len(batch) < MAX_PAGES:
                    url = queue.pop(0)
                    if url not in visited:
                        visited.add(url)
                        batch.append(url)
                async def safe_page(url):
                    async with sem:
                        return await _page(client, url)
                for page_records, links in await asyncio.gather(*(safe_page(url) for url in batch)):
                    records.extend(page_records)
                    queue.extend(link for link in links if link not in visited and link not in queue)
    normalized = [_normalize(item) for item in records]
    normalized = [item for item in normalized if item]
    if not normalized:
        raise RuntimeError("No restaurant records found. Set WIBEST_JSON_URL to a public JSON feed if the site has no JSON-LD records.")
    frame = pd.DataFrame(normalized).drop_duplicates(subset=["id"], keep="last")
    frame["rating"] = pd.to_numeric(frame["rating"], errors="coerce").astype("float64")
    frame["reviews"] = pd.to_numeric(frame["reviews"], errors="coerce").fillna(0).astype("int64")
    # Materialize partitions by state/city so each sync chunk stays manageable.
    frame.sort_values(["state", "city"], inplace=True)
    return frame


async def main() -> None:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY).")
    frame = await extract()
    client = create_client(url, key)
    total = 0
    for (_state, _city), partition in frame.groupby(["state", "city"], sort=True):
        payload = partition.where(pd.notna(partition), None).to_dict(orient="records")
        # Keep requests below PostgREST payload limits.
        for start in range(0, len(payload), 500):
            client.table("restaurants").upsert(payload[start:start + 500], on_conflict="id").execute()
            total += len(payload[start:start + 500])
    print(f"Synced {total} restaurant records from {frame['city'].nunique()} cities and {frame['state'].nunique()} states.")


if __name__ == "__main__":
    asyncio.run(main())
