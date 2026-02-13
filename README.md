# Velora Jobs

Automated Client Acquisition System for jobs.velora.my.id.

## Structure
- `frontend/`: Next.js 15 (Dashboard UI)
- `backend/`: FastAPI + Playwright (Core Scraper & API)

## Setup Local
1. Start Database: `docker run -d --name velora_jobs_db ...` (Cek `docker-compose.yml` if available)
2. Backend:
   - `cd backend`
   - `pip install -r requirements.txt`
   - `playwright install chromium --with-deps`
   - `uvicorn main:app --reload`
3. Frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Deployment
Deployed on VPS via Docker Compose & Nginx.
Domain: [jobs.velora.my.id](https://jobs.velora.my.id)
