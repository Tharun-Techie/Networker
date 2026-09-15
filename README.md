# Project Networker

Relationship-intelligence product: graph-first (Neo4j) + Postgres (users,
evidence metadata, jobs, audit) + OpenSearch (names/aliases) + S3 (source
documents) + Redis (queue/cache). FastAPI backend, React+TS+Sigma.js frontend.

## Quick start (local dev, needs Docker)

```bash
cp .env.example .env
docker compose up --build          # core: postgres, neo4j, redis, minio, backend, frontend
docker compose --profile search up # also start OpenSearch
docker compose --profile worker up # also start arq background worker
```

Local worker without Docker (needs Redis running): `cd backend && arq app.worker.WorkerSettings`.

- Backend OpenAPI: http://localhost:8000/docs
- Frontend: http://localhost:5173
- Neo4j browser: http://localhost:7474

## Backend dev without Docker

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
pytest -q
```

Backend runs in degraded mode when Neo4j/Postgres/Redis are unreachable:
graph/search endpoints return 503 with a clear message instead of crashing.
Unit tests mock the graph driver so no live DB is needed.

## Key design decisions (locked in schema)

1. **Every edge carries `source` (evidence FK), `confidence`
   (`verified`/`inferred`/`unconfirmed`), `start_date`/`end_date`,
   `created_by`, `created_at`.** AI extraction always writes
   `confidence=inferred`; promotion to `verified` requires human review or a
   stronger source.
2. **Evidence artifacts live in Postgres + S3,** referenced by ID from Neo4j.
   The graph stays lean (node/edge metadata only).
3. **Graph traversal is server-side** (`/graph/expand`, `/graph/path`,
   `/graph/common` wrap Cypher). The frontend never sends raw Cypher.
4. **Entity resolution is a background job** (`services/entity_resolution.py`),
   never inline on write.

## Layout

```
backend/            FastAPI app, services, tests, neo4j_init.cypher
postgres_init/      init.sql for users/evidence/jobs/audit tables
frontend/           Vite React+TS, Sigma.js GraphCanvas
docker-compose.yml
Makefile
```
