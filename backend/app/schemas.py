"""Shared Pydantic schemas: node/edge model per the architecture plan.

Two node label families: Person, Organization, Family, Institution.
Every edge carries: start_date/end_date, source (evidence FK), confidence,
created_by, created_at. Fact vs inference = confidence level, not structure.
"""

from datetime import date, datetime
from enum import Enum
from typing import Any, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class NodeType(str, Enum):
    PERSON = "Person"
    ORGANIZATION = "Organization"
    FAMILY = "Family"
    INSTITUTION = "Institution"


class Confidence(str, Enum):
    VERIFIED = "verified"
    INFERRED = "inferred"
    UNCONFIRMED = "unconfirmed"


class RelType(str, Enum):
    EMPLOYEE_OF = "employee_of"
    DIRECTOR_OF = "director_of"
    BOARD_MEMBER_OF = "board_member_of"
    FOUNDER_OF = "founder_of"
    ADVISOR_TO = "advisor_to"
    PARENT_OF = "parent_of"
    CHILD_OF = "child_of"
    SPOUSE_OF = "spouse_of"
    SIBLING_OF = "sibling_of"
    STUDIED_AT = "studied_at"
    OWNS = "owns"
    INVESTED_IN = "invested_in"
    PARTNER_OF = "partner_of"


ALLOWED_LABELS = {t.value for t in NodeType}
ALLOWED_RELS = {t.value for t in RelType}


class NodeBase(BaseModel):
    type: NodeType
    name: str = Field(min_length=1, max_length=500)
    aliases: list[str] = Field(default_factory=list)
    attributes: dict[str, Any] = Field(default_factory=dict)


class NodeCreate(NodeBase):
    id: str = Field(default_factory=lambda: str(uuid4()))


class Node(NodeBase):
    id: str
    created_at: datetime
    updated_at: datetime
    last_verified_at: Optional[datetime] = None

    @property
    def label(self) -> str:
        return self.type.value


class EdgeBase(BaseModel):
    rel_type: RelType
    from_id: str
    to_id: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    source: str = Field(description="Evidence document ID (Postgres FK)")
    confidence: Confidence = Confidence.UNCONFIRMED
    note: Optional[str] = None


class EdgeCreate(EdgeBase):
    created_by: Optional[str] = None


class Edge(EdgeBase):
    id: str
    created_by: Optional[str] = None
    created_at: datetime


class GraphNodeOut(BaseModel):
    id: str
    label: str
    name: str
    aliases: list[str] = Field(default_factory=list)
    attributes: dict[str, Any] = Field(default_factory=dict)


class GraphEdgeOut(BaseModel):
    id: str
    rel_type: str
    from_id: str
    to_id: str
    confidence: str
    source: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class GraphResult(BaseModel):
    nodes: list[GraphNodeOut] = Field(default_factory=list)
    edges: list[GraphEdgeOut] = Field(default_factory=list)


class SearchHit(BaseModel):
    id: str
    label: str
    name: str
    score: float = 1.0
