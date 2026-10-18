# Local Table India

A small restaurant discovery app: FastAPI + Supabase backend and Vite/React frontend.

## Configure Supabase

1. Create a Supabase project and run the SQL block at the top of `scripts/ingest_wibest.py` in its SQL Editor.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your shell. The service role key is for trusted server/script use only; never expose it to Vite or commit it.
3. The ingest script defaults to WIB's public restaurant JSON dataset at `https://wibest.in/data/json/restaurants.json`; you can override it with `WIBEST_JSON_URL`. WIB's current dataset has ratings but no review counts, so the importer stores reviews as `0` rather than making them up. The score formula therefore ranks these records by rating until you add a licensed source with review counts. State values are mapped from the dataset's city names.
4. Run `python scripts/ingest_wibest.py` after installing `backend/requirements.txt`.

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
