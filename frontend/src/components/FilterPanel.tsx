export const REL_TYPES = [
  "employee_of", "director_of", "board_member_of", "chairman_of", "founder_of",
  "owns", "subsidiary_of", "invested_in", "advisor_to",
  "parent_of", "child_of", "spouse_of", "sibling_of", "family_of", "associated_with",
  "worked_with", "former_colleague_of", "mentor_of", "partner_of", "served_with",
  "studied_at", "alumni_of", "member_of", "trustee_of",
];

export const REL_CATEGORIES: Record<string, string[]> = {
  family: ["parent_of", "child_of", "spouse_of", "sibling_of", "family_of", "associated_with"],
  board: ["director_of", "board_member_of", "chairman_of", "trustee_of", "served_with"],
  employment: ["employee_of", "worked_with", "former_colleague_of"],
  ownership: ["owns", "subsidiary_of", "invested_in", "founder_of"],
  education: ["studied_at", "alumni_of"],
  partnership: ["partner_of", "mentor_of", "advisor_to", "member_of"],
};

export const NODE_TYPES = ["Person", "Organization", "Family", "Institution"];

export default function FilterPanel({
  rel, setRel, depth, setDepth, since, setSince, until, setUntil,
  nodeTypes, setNodeTypes,
}: {
  rel: string[];
  setRel: (r: string[]) => void;
  depth: number;
  setDepth: (d: number) => void;
  since: string;
  setSince: (s: string) => void;
  until: string;
  setUntil: (s: string) => void;
  nodeTypes?: string[];
  setNodeTypes?: (t: string[]) => void;
}) {
  const toggle = (r: string) =>
    setRel(rel.includes(r) ? rel.filter((x) => x !== r) : [...rel, r]);
  const toggleType = (t: string) => {
    if (!setNodeTypes || !nodeTypes) return;
    setNodeTypes(nodeTypes.includes(t) ? nodeTypes.filter((x) => x !== t) : [...nodeTypes, t]);
  };
  const selectCategory = (cat: string) =>
    setRel(Array.from(new Set([...rel, ...REL_CATEGORIES[cat]])));
  return (
    <div className="side-stack">
      <div className="card">
        <h4>Traversal</h4>
        <label className="flabel">Depth (1–4)</label>
        <input
          type="number" min={1} max={4} value={depth}
          onChange={(e) => setDepth(Number(e.target.value))} style={{ width: "100%" }}
        />
        <div className="mt">
          <label className="flabel">Active since</label>
          <input type="date" value={since} onChange={(e) => setSince(e.target.value)} style={{ width: "100%" }} />
        </div>
        <div className="mt">
          <label className="flabel">Active until</label>
          <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} style={{ width: "100%" }} />
        </div>
      </div>
      {nodeTypes && setNodeTypes && (
        <div className="card">
          <h4>Node types</h4>
          {NODE_TYPES.map((t) => (
            <label key={t} className="checkline">
              <input type="checkbox" checked={nodeTypes.includes(t)} onChange={() => toggleType(t)} /> {t}
            </label>
          ))}
        </div>
      )}
      <div className="card">
        <h4>Relationships</h4>
        <div className="row wrap">
          {Object.keys(REL_CATEGORIES).map((c) => (
            <button key={c} type="button" className="chip" onClick={() => selectCategory(c)}>
              + {c}
            </button>
          ))}
          <button type="button" className="chip" onClick={() => setRel([])}>clear</button>
        </div>
        <div className="mt">
          {REL_TYPES.map((r) => (
            <label key={r} className="checkline">
              <input type="checkbox" checked={rel.includes(r)} onChange={() => toggle(r)} />{" "}
              <span className="mono">{r}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
