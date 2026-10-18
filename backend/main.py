import math
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from database import fetch_rows
from schemas import Restaurant

app = FastAPI(title="India Restaurant Discovery API", version="1.0.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=False,
    allow_methods=["GET"], allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/cities")
def cities():
    try:
        rows = fetch_rows(select="city", filters={"is_legit": True})
        return {"cities": sorted({r["city"] for r in rows if r.get("city")})}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not read cities from Supabase: {exc}") from exc


@app.get("/api/cuisines")
def cuisines(city: str = Query(min_length=1, max_length=120)):
    try:
        rows = fetch_rows(select="cuisine", filters={"city": city, "is_legit": True})
        return {"cuisines": sorted({c.strip() for r in rows for c in (r.get("cuisine") or []) if c and c.strip()})}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not read cuisines from Supabase: {exc}") from exc


@app.get("/api/restaurants", response_model=List[Restaurant])
def restaurants(city: str = Query(min_length=1, max_length=120), cuisine: Optional[str] = Query(default=None, max_length=120)):
    try:
        rows = fetch_rows(filters={"city": city, "is_legit": True})
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not read restaurants from Supabase: {exc}") from exc
    result = []
    for row in rows:
        row_cuisines = row.get("cuisine") or []
        if cuisine and cuisine.casefold() not in {c.casefold() for c in row_cuisines}:
            continue
        rating = float(row.get("rating") or 0)
        reviews = max(0, int(row.get("reviews") or 0))
        row["score"] = (rating * 0.7) + (math.log10(reviews + 1) * 0.3)
        result.append(row)
    result.sort(key=lambda row: (row["score"], int(row.get("reviews") or 0)), reverse=True)
    return result[:10]
