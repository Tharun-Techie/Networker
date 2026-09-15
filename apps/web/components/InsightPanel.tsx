import type { Insight } from "@/lib/api";

/** Network-intelligence panel: FACTS and INFERENCES stay visually separate. */
export default function InsightPanel({ insight }: { insight: Insight }) {
  return (
    <div className="card">
      <h3>Network intelligence</h3>
      <p>{insight.headline}</p>
      <h4>Facts · from evidence</h4>
      {insight.facts.length === 0 ? (
        <p className="empty">No edges in view.</p>
      ) : (
        <ul className="list">
          {insight.facts.map((f, i) => (
            <li key={i} className="mono">
              {f.text}
            </li>
          ))}
        </ul>
      )}
      <h4>Inferences · investigate, don&apos;t assume</h4>
      {insight.inferences.length === 0 ? (
        <p className="empty">No patterns detected.</p>
      ) : (
        <ul className="list">
          {insight.inferences.map((f, i) => (
            <li key={i}>
              <span className="badge b-inferred">{f.kind}</span> {f.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
