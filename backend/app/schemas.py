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
    # Corporate
    EMPLOYEE_OF = "employee_of"
    DIRECTOR_OF = "director_of"
    BOARD_MEMBER_OF = "board_member_of"
    CHAIRMAN_OF = "chairman_of"
    FOUNDER_OF = "founder_of"
    OWNER_OF = "owns"  # COMPANY -owns-> COMPANY (value kept for back-compat)
    SUBSIDIARY_OF = "subsidiary_of"
    INVESTED_IN = "invested_in"
    ADVISOR_TO = "advisor_to"
    # Family
    PARENT_OF = "parent_of"
    CHILD_OF = "child_of"
    SPOUSE_OF = "spouse_of"
    SIBLING_OF = "sibling_of"
    FAMILY_OF = "family_of"  # PERSON -family_of-> PERSON (generic kinship)
    ASSOCIATED_WITH = "associated_with"  # PERSON -associated_with-> FAMILY
    # Professional
    WORKED_WITH = "worked_with"
    FORMER_COLLEAGUE_OF = "former_colleague_of"
    MENTOR_OF = "mentor_of"
    PARTNER_OF = "partner_of"
    SERVED_WITH = "served_with"  # co-tenure (e.g. same board/term)
    # Education / institutional
    STUDIED_AT = "studied_at"
    ALUMNI_OF = "alumni_of"
    MEMBER_OF = "member_of"
    TRUSTEE_OF = "trustee_of"

    # Back-compat alias: RelType.OWNS == RelType.OWNER_OF == "owns".
    OWNS = "owns"


ALLOWED_LABELS = {t.value for t in NodeType}
ALLOWED_RELS = {t.value for t in RelType}

# Relationship categories for the filter panel / query UI.
# Concept §11: strict taxonomy so the graph stays queryable.
REL_CATEGORIES: dict[str, list[str]] = {
    "family": [RelType.PARENT_OF.value, RelType.CHILD_OF.value,
               RelType.SPOUSE_OF.value, RelType.SIBLING_OF.value,
               RelType.FAMILY_OF.value, RelType.ASSOCIATED_WITH.value],
    "board": [RelType.DIRECTOR_OF.value, RelType.BOARD_MEMBER_OF.value,
              RelType.CHAIRMAN_OF.value, RelType.TRUSTEE_OF.value,
              RelType.SERVED_WITH.value],
    "employment": [RelType.EMPLOYEE_OF.value, RelType.WORKED_WITH.value,
                   RelType.FORMER_COLLEAGUE_OF.value],
    "ownership": [RelType.OWNER_OF.value, RelType.SUBSIDIARY_OF.value,
                  RelType.INVESTED_IN.value, RelType.FOUNDER_OF.value],
    "education": [RelType.STUDIED_AT.value, RelType.ALUMNI_OF.value],
    "partnership": [RelType.PARTNER_OF.value, RelType.MENTOR_OF.value,
                    RelType.ADVISOR_TO.value, RelType.MEMBER_OF.value],
}

# Documented attribute facets (stored in node.attributes, filterable).
# Concept §3/§7: profession, designation, industry, location, family.
ATTRIBUTE_FACETS = ("profession", "designation", "industry", "location",
                    "family", "kind")


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
