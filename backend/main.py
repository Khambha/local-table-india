import logging
import math
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from database import fetch_rows
from discovery import discover_city
from schemas import Restaurant

logger = logging.getLogger(__name__)
app = FastAPI(title="India Restaurant Discovery API", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/cities")
async def cities():
    try:
        rows = await run_in_threadpool(fetch_rows, select="city", filters={"is_legit": True})
        return {"cities": sorted({r["city"] for r in rows if r.get("city")})}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not read cities from Supabase.") from exc


@app.get("/api/cuisines")
async def cuisines(city: str = Query(min_length=1, max_length=120)):
    try:
        rows = await run_in_threadpool(
            fetch_rows, select="cuisine", filters={"city": city, "is_legit": True}
        )
        values = {c.strip() for row in rows for c in (row.get("cuisine") or []) if c and c.strip()}
        if values:
            return {"cuisines": sorted(values)}
    except Exception as exc:
        logger.info("No stored cuisine list for %s; trying live discovery: %s", city, exc)

    try:
        rows = await discover_city(city)
        return {"cuisines": sorted({c for row in rows for c in row.get("cuisine", [])})}
    except Exception as exc:
        logger.warning("OpenStreetMap cuisine discovery failed for %s: %s", city, exc)
        return {"cuisines": []}


@app.get("/api/restaurants", response_model=List[Restaurant])
async def restaurants(
    city: str = Query(min_length=1, max_length=120),
    cuisine: Optional[str] = Query(default=None, max_length=120),
):
    rows = []
    try:
        rows = await run_in_threadpool(fetch_rows, filters={"city": city, "is_legit": True})
    except Exception as exc:
        # A typed city can still use the live OpenStreetMap path if Supabase is unavailable.
        logger.info("Supabase lookup failed for %s; trying live discovery: %s", city, exc)

    if rows:
        result = []
        for row in rows:
            row_cuisines = row.get("cuisine") or []
            if cuisine and cuisine.casefold() not in {c.casefold() for c in row_cuisines}:
                continue
            rating = float(row.get("rating") or 0)
            reviews = max(0, int(row.get("reviews") or 0))
            row["score"] = (rating * 0.7) + (math.log10(reviews + 1) * 0.3)
            row["source"] = "wibest"
            result.append(row)
        result.sort(key=lambda row: (row["score"], int(row.get("reviews") or 0)), reverse=True)
        return result[:10]

    try:
        discovered = await discover_city(city)
    except Exception as exc:
        logger.exception("Restaurant discovery failed for city %s", city)
        raise HTTPException(
            status_code=502,
            detail="Live city discovery is temporarily unavailable. Please try again shortly.",
        ) from exc

    if cuisine:
        discovered = [
            row for row in discovered
            if cuisine.casefold() in {value.casefold() for value in row.get("cuisine", [])}
        ]
    return discovered[:10]
