from fastapi import APIRouter, HTTPException

from app import db_neo4j
from app.schemas import Node, NodeCreate
from app.services import graph_service

router = APIRouter(prefix="/api/nodes", tags=["nodes"])


@router.post("", response_model=dict)
async def create_node(data: NodeCreate):
    try:
        return await graph_service.create_node(data, db_neo4j.run_write)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))


@router.get("/{node_id}", response_model=dict)
async def get_node(node_id: str):
    try:
        rows = await db_neo4j.run_read("MATCH (n {id: $id}) RETURN n LIMIT 1", {"id": node_id})
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    if not rows:
        raise HTTPException(404, "Node not found")
    return rows[0]["n"]
