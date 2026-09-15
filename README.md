# Networker — monorepo (Next.js + Neo4j)

Relationship-intelligence platform: people, organizations, families, and
institutions mapped into a searchable visual network. One Next.js app serves
both the UI and the API — no separate Python backend to operate.

```
networker-mono/
  apps/web/          Next.js 14 App Router (UI + API routes, TypeScript)
    app/             pages: Explore, Search/Query, Person, Org, Add, Login
    app/api/         API routes (nodes, edges, graph, search, evidence, auth, jobs)
    lib/             neo4j/pg/s3/auth clients + graph/search services
    scripts/         db:init (constraints), db:seed (Tata demo graph)
  packages/shared/   taxonomy, insight summarizer, entity resolution (pure TS)
```

## Tech choices (matched to complexity)

| Concern | Choice | Why |
|---|---|---|
| Full stack | Next.js 14 App Router + TypeScript | One deployable, UI + API in one process, no CORS/proxy hacks |
| Graph store | Neo4j (`neo4j-driver`) | Native graph traversals; server-side Cypher only, clients never send queries |
| Relational store | Postgres (`pg`, raw SQL) | Evidence metadata, users, jobs — boring tables, no ORM needed |
| Validation | `zod` | Replaces pydantic with the same guarantees at the route boundary |
| Auth | `jose` (JWT) + `bcryptjs` + httpOnly cookie | Same model as before (register/login/roles), no Auth0 dependency |
| Evidence blobs | AWS SDK v3 presigned PUT (S3/MinIO) | Direct-to-object upload; Postgres keeps metadata, graph keeps IDs |
| Search | OpenSearch optional → Neo4j full-text fallback | Same degraded-mode behavior as before |
| Graph viz | Sigma.js + graphology | Unchanged — framework-agnostic, works in client components |
| Background jobs | On-demand `/api/jobs` routes | arq/Redis replaced: ingest + duplicate scan run via API (cron-compatible) |

## Quick start

```bash
cd networker-mono
npm install
cp apps/web/.env.example apps/web/.env.local   # adjust creds if needed

npm run db:init    # Neo4j constraints + full-text index
npm run db:seed    # Tata demo graph (8 nodes, 10 edges)

npm run dev        # http://localhost:3000
```

Postgres schema lives alongside the app (`./postgres_init/init.sql`);
apply once with `psql -f`. Services expected locally:

- Neo4j bolt `localhost:7687` (user `neo4j`)
- Postgres `localhost:5432` (db `networker`)
- OpenSearch / MinIO optional — endpoints degrade to 503 with a clear message

## API parity map (old → new)

| FastAPI | Next.js |
|---|---|
| `POST /api/nodes`, `GET /api/nodes/{id}` | `POST /api/nodes`, `GET /api/nodes/[id]` |
| `POST /api/edges`, `PATCH /api/edges/{id}/confidence` | same under `/api/edges…` |
| `DELETE /api/edges/{id}` (new) | remove a relationship, nodes untouched |
| `GET /graph/node/{id}/expand`, `/timeline`, `/path`, `/common`, `/shared-employment`, `/connectors`, `/board-overlap`, `POST /graph/insight` | same paths under `/api/graph…` |
| `GET /graph/hierarchy` (new) | ownership / family / corporate trees |
| `GET /search` | `GET /api/search` |
| `POST/GET /api/evidence`, `POST /api/evidence/upload-url` | same under `/api/evidence…` |
| `POST /api/auth/register`, `POST /api/auth/token` (OAuth2 form) | `POST /api/auth/register`, `POST /api/auth/login` (JSON, cookie session) |
| arq `ingest_candidates`, `scan_duplicates`, `enrich_node` | `POST /api/jobs` (ingest), `GET /api/jobs` (duplicates), `POST /api/nodes/[id]/enrich` |

Behavioral rules preserved: every edge needs `source` + `confidence`;
auto-ingest forces `inferred`; promotion to `verified` needs a human actor;
insight keeps FACTS and INFERENCES separate with edge-id citations.

## Fixes vs the old stack (no regressions, two defects fixed)

- Nodes always carry `label`, edges always carry `rel_type` (projected in
  Cypher) — the old API omitted both, breaking type filters and edge labels.
- Multi-hop expand returns **all** nodes along each path (old query dropped
  intermediate nodes on 2+ hop expansions).
- No `localhost:8000` browser calls — UI and API share one origin, so the app
  works through proxied preview URLs with no Vite proxy needed.
