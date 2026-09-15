/**
 * Strict relationship taxonomy (concept §11) + node model.
 * Ported from backend/app/schemas.py — values are the source of truth and
 * must stay in sync with what is stored in Neo4j.
 */

export const NODE_TYPES = ["Person", "Organization", "Family", "Institution"] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const CONFIDENCES = ["verified", "inferred", "unconfirmed"] as const;
export type Confidence = (typeof CONFIDENCES)[number];

/** Every allowed relationship-type value. `owns` keeps its historic value. */
export const REL_TYPES = [
  // Corporate
  "employee_of",
  "director_of",
  "board_member_of",
  "chairman_of",
  "founder_of",
  "owns",
  "subsidiary_of",
  "invested_in",
  "advisor_to",
  // Family
  "parent_of",
  "child_of",
  "spouse_of",
  "sibling_of",
  "family_of",
  "associated_with",
  // Professional
  "worked_with",
  "former_colleague_of",
  "mentor_of",
  "partner_of",
  "served_with",
  // Education / institutional
  "studied_at",
  "alumni_of",
  "member_of",
  "trustee_of",
] as const;
export type RelType = (typeof REL_TYPES)[number];

const REL_SET: ReadonlySet<string> = new Set(REL_TYPES);

export function assertRelType(value: string): asserts value is RelType {
  if (!REL_SET.has(value)) throw new Error(`Unknown relationship type: ${value}`);
}

export function assertNodeType(value: string): asserts value is NodeType {
  if (!(NODE_TYPES as readonly string[]).includes(value)) {
    throw new Error(`Unknown node type: ${value}`);
  }
}

/** Relationship categories for the filter panel / query UI. */
export const REL_CATEGORIES: Record<string, RelType[]> = {
  family: ["parent_of", "child_of", "spouse_of", "sibling_of", "family_of", "associated_with"],
  board: ["director_of", "board_member_of", "chairman_of", "trustee_of", "served_with"],
  employment: ["employee_of", "worked_with", "former_colleague_of"],
  ownership: ["owns", "subsidiary_of", "invested_in", "founder_of"],
  education: ["studied_at", "alumni_of"],
  partnership: ["partner_of", "mentor_of", "advisor_to", "member_of"],
};

/** Documented attribute facets stored in node.attributes (filterable). */
export const ATTRIBUTE_FACETS = ["profession", "designation", "industry", "location", "family", "kind"] as const;

/** Edges that count as "having worked at / served" an organization. */
export const WORK_REL_TYPES: RelType[] = [
  "employee_of",
  "director_of",
  "board_member_of",
  "chairman_of",
  "founder_of",
  "advisor_to",
];

/** Board-membership edges (overlap / interlock queries). */
export const BOARD_REL_TYPES: RelType[] = [
  "director_of",
  "board_member_of",
  "chairman_of",
  "trustee_of",
];

export const FAMILY_REL_TYPES: RelType[] = [
  "parent_of",
  "child_of",
  "spouse_of",
  "sibling_of",
  "family_of",
  "associated_with",
];

/** Attribute fields shown on the Add-entity form, per node type. */
export const ATTR_FIELDS: Record<NodeType, string[]> = {
  Person: ["profession", "designation", "location"],
  Organization: ["industry", "location"],
  Family: ["location"],
  Institution: ["kind", "location"],
};

export interface GraphNode {
  id: string;
  label?: string;
  name: string;
  aliases?: string[];
  attributes?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  from_id: string;
  to_id: string;
  rel_type: string;
  confidence: Confidence;
  source: string;
  start_date?: string | null;
  end_date?: string | null;
  note?: string | null;
}

export interface GraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
