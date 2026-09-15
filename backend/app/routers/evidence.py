"""Evidence layer: Postgres metadata + S3 blobs, referenced by edge.source."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db_postgres import get_session
from app.models_sql import EvidenceDocument
from app.services import storage

router = APIRouter(prefix="/api/evidence", tags=["evidence"])


class UploadUrlRequest(BaseModel):
    filename: str
    content_type: str = "application/octet-stream"


class UploadUrlOut(BaseModel):
    key: str
    url: str
    bucket: str
    expires_in: int


@router.post("/upload-url", response_model=UploadUrlOut)
async def upload_url(data: UploadUrlRequest):
    """Step 1 of evidence upload: get a presigned PUT URL, upload bytes
    directly to S3, then POST the metadata (with s3_key) below."""
    try:
        return storage.presigned_upload_url(data.filename, data.content_type)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))


class EvidenceCreate(BaseModel):
    title: str
    source_url: str | None = None
    s3_key: str | None = None
    quote: str | None = None
    page_ref: str | None = None
    added_by: str | None = None
    doc_metadata: dict = {}


class EvidenceOut(EvidenceCreate):
    id: str


@router.post("", response_model=EvidenceOut)
async def create_evidence(data: EvidenceCreate, session: AsyncSession = Depends(get_session)):
    doc = EvidenceDocument(**data.model_dump())
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return EvidenceOut(id=str(doc.id), **data.model_dump())


@router.get("/{doc_id}", response_model=EvidenceOut)
async def get_evidence(doc_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    doc = (await session.execute(select(EvidenceDocument).where(EvidenceDocument.id == doc_id))).scalar_one_or_none()
    if doc is None:
        raise HTTPException(404, "Evidence not found")
    return EvidenceOut(
        id=str(doc.id), title=doc.title, source_url=doc.source_url, s3_key=doc.s3_key,
        quote=doc.quote, page_ref=doc.page_ref, added_by=doc.added_by,
        doc_metadata=doc.doc_metadata,
    )
