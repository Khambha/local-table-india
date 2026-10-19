"""On-demand OpenStreetMap discovery for cities missing from the WIB dataset."""
import asyncio
import logging
import os
import re
import time
from typing import Any, Dict, List

import httpx
from starlette.concurrency import run_in_threadpool

from database import fetch_discovery_cache, save_discovery_cache

logger = logging.getLogger(__name__)
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
MEMORY_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60
MAX_DISCOVERED_PLACES = 40
_memory_cache: Dict[str, tuple[float, List[Dict[str, Any]]]] = {}
_discovery_lock = asyncio.Lock()
_last_city_lookup_at = 0.0


def city_cache_key(city: str) -> str:
    return re.sub(r"\s+", " ", city.strip()).casefold()


def _application_headers() -> Dict[str, str]:
    contact = os.getenv("OSM_CONTACT_EMAIL", "").strip()
    product = "LocalTableIndia/1.0 (+https://github.com/Khambha/local-table-india)"
    if contact:
        product = f"{product}; contact: {contact}"
    return {"User-Agent": product, "Accept": "application/json"}


def _cuisines(raw: str) -> List[str]:
    return sorted({part.strip().replace("_", " ").title()
                   for part in re.split(r"[;,/]", raw or "") if part.strip()})


async def _fetch_from_openstreetmap(city: str) -> List[Dict[str, Any]]:
    headers = _application_headers()
    timeout = httpx.Timeout(20.0, connect=8.0)
    async with httpx.AsyncClient(timeout=timeout, headers=headers, follow_redirects=True) as client:
        # This is a direct user-submitted city search, never an autocomplete request.
        # Nominatim returns its best-matching POIs, not an exhaustive city inventory.
        response = await client.get(
            NOMINATIM_URL,
            params={"city": city, "amenity": "restaurant", "country": "India",
                    "countrycodes": "in", "format": "jsonv2", "addressdetails": 1,
                    "extratags": 1, "limit": MAX_DISCOVERED_PLACES},
        )
        response.raise_for_status()
        locations = response.json()

    places: List[Dict[str, Any]] = []
    for location in locations:
        name = (location.get("name") or "").strip()
        if not name:
            continue
        try:
            place_latitude = float(location["lat"])
            place_longitude = float(location["lon"])
        except (KeyError, TypeError, ValueError):
            place_latitude = place_longitude = None

        element_type = str(location.get("osm_type", "node")).lower()
        element_id = location.get("osm_id")
        if not element_id:
            continue
        address_parts = location.get("address") or {}
        state = (address_parts.get("state") or address_parts.get("union_territory")
                 or address_parts.get("state_district") or "India")
        address = ", ".join(filter(None, [
            address_parts.get("road"), address_parts.get("suburb")
            or address_parts.get("neighbourhood"),
            address_parts.get("city") or address_parts.get("town")
            or address_parts.get("village"),
        ])) or None
        extra_tags = location.get("extratags") or {}
        places.append({
            "id": f"osm-{element_type}-{element_id}",
            "name": name,
            "city": city.strip(),
            "state": state,
            "cuisine": _cuisines(extra_tags.get("cuisine", "")),
            "rating": None,
            "reviews": 0,
            "is_legit": True,
            "last_checked": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "score": None,
            "source": "openstreetmap",
            "source_url": f"https://www.openstreetmap.org/{element_type}/{element_id}",
            "latitude": place_latitude,
            "longitude": place_longitude,
            "address": address,
        })

    # Nominatim orders by search relevance; no customer-rating rank is implied.
    return places[:MAX_DISCOVERED_PLACES]


async def discover_city(city: str) -> List[Dict[str, Any]]:
    """Return cached or newly discovered OSM places; tolerate absent cache-table migration."""
    global _last_city_lookup_at
    key = city_cache_key(city)
    if not key:
        return []
    cached_memory = _memory_cache.get(key)
    if cached_memory and cached_memory[0] > time.monotonic():
        return cached_memory[1]

    async with _discovery_lock:
        cached_memory = _memory_cache.get(key)
        if cached_memory and cached_memory[0] > time.monotonic():
            return cached_memory[1]

        try:
            entry = await run_in_threadpool(fetch_discovery_cache, key)
            if entry and isinstance(entry.get("results"), list):
                results = entry["results"]
                _memory_cache[key] = (time.monotonic() + MEMORY_CACHE_TTL_SECONDS, results)
                return results
        except Exception as exc:
            # The API remains useful without the optional persistent-cache SQL migration.
            logger.info("Persistent city discovery cache unavailable: %s", exc)

        # Nominatim's public service asks applications to stay at or below
        # one request per second. The lock makes this throttle global per API process.
        wait_seconds = 1.0 - (time.monotonic() - _last_city_lookup_at)
        if _last_city_lookup_at and wait_seconds > 0:
            await asyncio.sleep(wait_seconds)
        _last_city_lookup_at = time.monotonic()
        results = await _fetch_from_openstreetmap(city.strip())
        _memory_cache[key] = (time.monotonic() + MEMORY_CACHE_TTL_SECONDS, results)
        try:
            await run_in_threadpool(save_discovery_cache, key, results)
        except Exception as exc:
            logger.info("Could not persist discovery results; keeping process cache: %s", exc)
        return results
