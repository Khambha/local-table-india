"""Check public search snippets for clear permanent-closure signals."""
import asyncio
import os
import re
from typing import Dict, List
from urllib.parse import quote_plus

import httpx
from bs4 import BeautifulSoup
from supabase import create_client

NEGATIVE = re.compile(r"\b(permanently closed|closed permanently|permanently shut|no longer in business)\b", re.I)
POSITIVE = re.compile(r"\b(open now|currently open|temporarily closed)\b", re.I)


async def search_snippet(client: httpx.AsyncClient, name: str, city: str) -> str:
    url = "https://html.duckduckgo.com/html/?q=" + quote_plus(f'"{name}" "{city}" restaurant')
    response = await client.get(url)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    return " ".join(el.get_text(" ", strip=True) for el in soup.select(".result, .result__snippet, .result__title"))


async def main() -> None:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY).")
    db = create_client(url, key)
    rows: List[Dict] = db.table("restaurants").select("id,name,city").eq("is_legit", True).execute().data or []
    headers = {"User-Agent": "Mozilla/5.0 (compatible; IndiaFoodIndexVerifier/1.0)"}
    changed = 0
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=headers) as client:
        semaphore = asyncio.Semaphore(4)
        async def check(row: Dict) -> bool:
            async with semaphore:
                try:
                    snippet = await search_snippet(client, row["name"], row["city"])
                except (httpx.HTTPError, KeyError):
                    return False
                # Require an explicit closure phrase and no current/open signal.
                if NEGATIVE.search(snippet) and not POSITIVE.search(snippet):
                    db.table("restaurants").update({"is_legit": False}).eq("id", row["id"]).execute()
                    return True
                return False
        results = await asyncio.gather(*(check(row) for row in rows))
        changed = sum(results)
    print(f"Checked {len(rows)} active records; marked {changed} as closed based on explicit search snippets.")


if __name__ == "__main__":
    asyncio.run(main())
