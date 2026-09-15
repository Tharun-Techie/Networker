from fastapi import APIRouter, HTTPException

from app import db_neo4j
from app.schemas import Confidence, EdgeCreate
from app.services import graph_service

router = APIRouter(prefix="/api/edges", tags=["edges"])


@router.post("", response_model=dict)
async def create_edge(data: EdgeCreate):
    try:
        return await graph_service.create_edge(data, db_neo4j.run_write)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    except ValueError as exc:
        raise HTTPException(400, str(exc))


@router.patch("/{edge_id}/confidence", response_model=dict)
async def set_confidence(edge_id: str, confidence: Confidence, actor: str = ""):
    """Promote/demote edge confidence. VERIFIED requires a human actor."""
    try:
        return await graph_service.update_edge_confidence(edge_id, confidence, actor, db_neo4j.run_write)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    except ValueError as exc:
        raise HTTPException(400, str(exc))
