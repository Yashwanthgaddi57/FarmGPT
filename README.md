<div align="center">

# 🌱 AgriGPT

**AI-Powered Farmer Income Optimization Platform**

Crop recommendations · Disease detection · Profit prediction · Market intelligence · Weather advisories · Multi-agent AI copilot

`Next.js 15` · `FastAPI` · `Claude Sonnet` · `LangGraph` · `Supabase` · `PostgreSQL` · `Redis` · `Vercel` + `Render`

</div>

---

## What it does

AgriGPT routes every farmer question through a **LangGraph multi-agent system** — a Coordinator that classifies intent and six specialists that answer with numeric rigor:

| Agent | Capability |
|---|---|
| 🌾 Crop Recommendation | 5 ranked crops by expected profit for soil/water/budget/season |
| 🔬 Disease Detection | Claude Vision on leaf photos → severity, treatment, prevention |
| 💰 Profit Optimization | Best/average/worst-case yield, revenue, ROI scenarios |
| 📈 Market Forecast | Price trends, demand/supply, sell-now vs wait guidance |
| ⛅ Weather Agent | 7-day agro-meteorology → plant/irrigate/harvest actions |
| 💬 Advisor | Conversational copilot with full farm context memory |

Everything the AI produces is **persisted** (recommendations, reports, predictions, forecasts, chat, agent logs) and surfaced through dashboards, history pages and analytics KPIs.

## Architecture

```
┌─────────────────┐      HTTPS/JWT      ┌──────────────────┐
│  Next.js 15     │ ──────────────────► │  FastAPI (Render)│
│  (Vercel)       │                     │  ├─ Routers      │
│  Tailwind/shadcn│                     │  ├─ Services     │
│  TanStack Query │                     │  ├─ LangGraph ▸──┼──► Claude Sonnet
│  Recharts       │                     │  │   6 agents    │
└─────────────────┘                     │  └─ SQLAlchemy   │
                                        └───────┬──────────┘
              Open-Meteo (weather) ◄────────────┤
                                                ▼
                            ┌───────────────────────────────┐
                            │ Supabase: Postgres + Auth +   │
                            │ Storage (disease-images) + RLS│
                            └───────────────┬───────────────┘
                                            ▼
                                    Redis (cache + rate limit)
```

## Repository layout

```
agrisphere/
├── backend/
│   ├── app/
│   │   ├── ai/                 # claude_client, prompts, weather_client, LangGraph agents
│   │   ├── core/               # config, database, security(JWT), middleware, cache, deps
│   │   ├── models/             # 12 SQLAlchemy models
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/           # crop, disease, profit, market, weather, chat, notifications, analytics, dashboard
│   │   ├── routers/            # auth, users, dashboard, crops, disease, profit, market, weather, chat, notifications, analytics, admin
│   │   ├── main.py             # FastAPI app + lifespan scheduler
│   │   └── scheduler.py        # APScheduler alert generation
│   ├── alembic/                # migrations (0001 initial schema)
│   ├── tests/                  # pytest suite (16 tests, no external services)
│   ├── Dockerfile · render.yaml · requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                # landing, auth/*, dashboard/* (8 feature pages)
│   │   ├── components/         # ui/* (shadcn-style), landing/*, providers
│   │   ├── contexts/           # auth (Supabase + backend profile sync)
│   │   ├── hooks/              # use-api (TanStack Query for every endpoint), use-toast
│   │   ├── lib/                # api (axios + refresh), supabase, utils
│   │   └── types/              # shared TS types
│   ├── Dockerfile · vercel.json
├── supabase/
│   ├── schema.sql              # full DDL: enums, 12 tables, indexes, triggers
│   └── policies.sql            # RLS + storage bucket policies
├── docs/API.md                 # full endpoint reference
├── docker-compose.yml          # postgres + redis + backend + frontend
└── .env.example
```

## Quick start (local)

### Prerequisites
- Python 3.12, Node 20+
- A Supabase project (free tier works) — or use docker-compose Postgres for pure-local dev

### 1. Supabase setup (recommended)
1. Create a project at [supabase.com](https://supabase.com).
2. SQL Editor → run `supabase/schema.sql`, then `supabase/policies.sql`.
3. Auth → disable "Confirm email" if you want instant logins in dev.
4. Copy `Settings → API` values into your env.

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt      # Windows
# source .venv/bin/activate && pip install -r requirements.txt

cp ../.env.example .env                            # fill in values
.venv/Scripts/alembic upgrade head                 # plain-Postgres deployments
# (on Supabase, schema.sql already created everything; still run alembic to stamp)

.venv/Scripts/uvicorn app.main:app --reload --port 8000
```

Swagger: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
cp ../.env.example .env.local                      # fill NEXT_PUBLIC_* values
npm run dev
```

App: http://localhost:3000

### 4. Or run everything with Docker

```bash
cp .env.example .env
docker compose up --build
# frontend :3000, backend :8000, postgres :5432, redis :6379
```

## Environment variables

See [.env.example](.env.example). Key values:

| Var | Where | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | backend | Claude Sonnet for all agents |
| `SUPABASE_URL` / `SERVICE_KEY` / `ANON_KEY` / `JWT_SECRET` | backend | DB, auth verification, storage |
| `SUPABASE_DB_URL` | backend | SQLAlchemy connection string |
| `REDIS_URL` | backend | cache + rate limiting |
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` | frontend | browser auth |
| `NEXT_PUBLIC_API_URL` | frontend | FastAPI base URL |

## Deployment

### Frontend → Vercel
1. Import the repo; set **Root Directory** to `frontend` (config in `vercel.json`).
2. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`.

### Backend → Render
1. New Web Service from the repo; Render reads `backend/render.yaml` (Blueprint) or configure manually:
   - Root dir `backend`, build `pip install -r requirements.txt`, pre-deploy `alembic upgrade head`,
   - start `gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 2 -b 0.0.0.0:$PORT --timeout 120`.
2. Add all backend env vars + a Render Redis instance (`REDIS_URL`).
3. Add your Vercel domain to `BACKEND_CORS_ORIGINS`.

### Database → Supabase
Run `supabase/schema.sql` + `supabase/policies.sql` once; point `SUPABASE_DB_URL` at the connection pooler URI.

## Testing

```bash
cd backend && .venv/Scripts/python -m pytest tests/ -v     # 16 tests
cd frontend && npm run typecheck && npm run build          # type-safe production build
```

Backend tests run fully offline: SQLite in-memory DB, auth overridden, no Claude/Redis calls.

## Security model

- **Auth**: Supabase Auth issues JWTs; FastAPI verifies via JWKS (RS256) with HS256 fallback; profile rows auto-provision on first request.
- **RLS**: every table locked to `auth.uid()` for anon/authenticated clients; the backend alone holds the service-role key.
- **Storage**: `disease-images` bucket — public read, owner-scoped writes under `{user_id}/` prefix.
- **Rate limiting**: Redis fixed-window per IP (120 req/min), fail-open.
- **Secrets**: environment-only; `.env*` git-ignored.

## Roadmap

- Live Agmarknet/eNAM mandi price feed for market intelligence
- Bilingual UI (Hindi/Marathi) beyond the copilot
- WhatsApp bot surface for the copilot
- Field-level satellite NDVI overlays
