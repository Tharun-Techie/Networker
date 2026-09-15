import type { GraphEdge } from "../api";

const CONF_CLASS: Record<string, string> = {
  verified: "b-verified",
  inferred: "b-inferred",
  unconfirmed: "b-unconfirmed",
};

/** Evidence side-panel: clicking an edge shows source, dates, confidence. */
export default function EvidencePanel({ edge }: { edge: GraphEdge | null }) {
  if (!edge)
    return (
      <div className="card">
        <h3>Evidence</h3>
        <p className="empty">Select an edge in the graph to see why Networker believes this relationship exists.</p>
      </div>
    );
  return (
    <div className="card">
      <h3>Evidence</h3>
      <p>
        <span className="badge b-type-Organization mono">{edge.rel_type}</span>{" "}
        <span className={`badge ${CONF_CLASS[edge.confidence] ?? "b-unconfirmed"}`}>
          {edge.confidence}
        </span>
      </p>
      <p className="mono">
        {edge.from_id} → {edge.to_id}
      </p>
      <p className="subtle">
        Period: {edge.start_date ?? "?"} → {edge.end_date ?? "ongoing"}
      </p>
      <p className="subtle">
        Source (evidence ID): <span className="mono">{edge.source}</span>
      </p>
    </div>
  );
}
