from fastapi import APIRouter, HTTPException, Query

from app.schemas import SearchHit
from app.services import search_service

router = APIRouter(tags=["search"])


@router.get("/search", response_model=list[SearchHit])
async def search(q: str = Query(min_length=1), limit: int = Query(20, ge=1, le=100)):
    try:
        hits = await search_service.search_nodes(q, limit)
        return [SearchHit(**h) for h in hits if h.get("id") and h.get("name")]
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
