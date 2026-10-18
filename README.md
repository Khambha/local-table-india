# Local Table India

A small restaurant discovery app: FastAPI + Supabase backend and Vite/React frontend.

## Configure Supabase

1. Create a Supabase project and run the SQL block at the top of `scripts/ingest_wibest.py` in its SQL Editor.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your shell. The service role key is for trusted server/script use only; never expose it to Vite or commit it.
3. The ingest script defaults to WIB's public restaurant JSON dataset at `https://wibest.in/data/json/restaurants.json`; you can override it with `WIBEST_JSON_URL`. WIB's current dataset has ratings but no review counts, so the importer stores reviews as `0` rather than making them up. The score formula therefore ranks these records by rating until you add a licensed source with review counts. State values are mapped from the dataset's city names.
4. Run `python scripts/ingest_wibest.py` after installing `backend/requirements.txt`.

## Add another city

The API and frontend discover cities from the `restaurants` table. Once a city has rows in Supabase, it appears in the selector automatically. No frontend edit is needed.

- **When WIB adds the city:** add its exact city name and state to `scripts/city_states.json`, then run the normal ingest command again. The importer reads WIB's full dataset and upserts the new rows without removing existing rows.
- **When you have a separate dataset:** provide a public JSON URL with a top-level `data` array (or a plain array). Each restaurant row needs `name`, `city`, and `state`; it can include `cuisines` (array), `rating`, and `reviews`. Set `WIBEST_JSON_URL` to that URL and run the importer. Rows without a state are only imported if their city exists in `city_states.json`. Use data you have permission to use; don’t scrape Google Maps, Zomato, or other services that prohibit it.

For example, a row can look like `{"name":"Restaurant Name","city":"Mysuru","state":"Karnataka","cuisines":["South Indian"],"rating":4.4,"reviews":120}`. Do not make up ratings or review counts; the importer accepts missing values.

## Run locally

Backend (from `backend/`):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Frontend (from `frontend/`):

```powershell
npm install
npm run dev
```

Set `VITE_API_URL` when the API is hosted somewhere other than `http://localhost:8000`.

## Monthly verification

Add repository secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in GitHub Actions settings. The workflow runs on the first day of each month and can also be started manually. DuckDuckGo snippets can be incomplete or inaccurate; the verifier only marks a restaurant closed when an explicit closure phrase appears without an open/current signal. Review the resulting data periodically. WIB's dataset is CC-BY 4.0; attribute WIB Open Data with a link to `https://wibest.in/data/` when you redistribute or publish it.
