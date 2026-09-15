export const REL_TYPES = [
  "employee_of", "director_of", "board_member_of", "founder_of", "advisor_to",
  "parent_of", "child_of", "spouse_of", "sibling_of", "studied_at",
  "owns", "invested_in", "partner_of",
];

export const NODE_TYPES = ["Person", "Organization", "Family", "Institution"];

export default function FilterPanel({
  rel, setRel, depth, setDepth, since, setSince, until, setUntil,
}: {
  rel: string[];
  setRel: (r: string[]) => void;
  depth: number;
  setDepth: (d: number) => void;
  since: string;
  setSince: (s: string) => void;
  until: string;
  setUntil: (s: string) => void;
}) {
  const toggle = (r: string) =>
    setRel(rel.includes(r) ? rel.filter((x) => x !== r) : [...rel, r]);
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "12px 0" }}>
      <label>
        Depth (1–4):{" "}
        <input
          type="number" min={1} max={4} value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
        />
      </label>
      <label>
        Active since:{" "}
        <input type="date" value={since} onChange={(e) => setSince(e.target.value)} />
      </label>
      <label>
        Active until:{" "}
        <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
      </label>
      <fieldset>
        <legend>Relationship types</legend>
        {REL_TYPES.map((r) => (
          <label key={r} style={{ marginRight: 8 }}>
            <input type="checkbox" checked={rel.includes(r)} onChange={() => toggle(r)} /> {r}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
