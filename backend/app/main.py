from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import db_neo4j
from app.routers import auth, edges, evidence, graph, nodes, search


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await db_neo4j.close_driver()


app = FastAPI(title="Networker API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (nodes.router, edges.router, graph.router, search.router, evidence.router, auth.router):
    app.include_router(r)


@app.get("/health")
async def health():
    driver = await db_neo4j.get_driver()
    return {"ok": True, "neo4j": driver is not None, "neo4j_error": db_neo4j.driver_error()}
