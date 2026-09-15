import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type GraphResult, type Insight, type TimelineItem } from "../api";
import GraphCanvas from "../components/GraphCanvas";
import { REL_CATEGORIES } from "../components/FilterPanel";

const CONF_CLASS: Record<string, string> = {
  verified: "b-verified",
  inferred: "b-inferred",
  unconfirmed: "b-unconfirmed",
};

function categoryOf(rel: string): string {
  for (const [cat, rels] of Object.entries(REL_CATEGORIES))
    if (rels.includes(rel)) return cat;
  return "other";
}

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

/** Person profile: identity → timeline → categorized connections → graph. */
export default function PersonProfile() {
  const { id = "" } = useParams();
  const [graph, setGraph] = useState<GraphResult>({ nodes: [], edges: [] });
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [insight, setInsight] = useState<Insight | null>(null);

  useEffect(() => {
    api.expand(id, 1).then(setGraph).catch(() => {});
    api.timeline(id).then(setTimeline).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const me = graph.nodes.find((n) => n.id === id);
  const grouped: Record<string, typeof timeline> = {};
  for (const t of timeline) {
    const c = categoryOf(t.edge.rel_type);
    (grouped[c] ??= []).push(t);
  }

  return (
    <div>
      <div className="card">
        <div className="profile-head">
          <div className="avatar">{initials(me?.name ?? id)}</div>
          <div>
            <h2>{me?.name ?? id}</h2>
            <p className="subtle" style={{ margin: 0 }}>
              {[me?.attributes?.designation, me?.attributes?.profession, me?.attributes?.location]
                .filter(Boolean)
                .join(" · ") || "Person"}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Career timeline</h3>
        {timeline.length === 0 ? (
          <p className="empty">No dated relationships yet.</p>
        ) : (
          <ol className="timeline">
            {timeline.map((t) => (
              <li key={t.edge.id}>
                <span className="t-date">{t.edge.start_date ?? "?"}</span>
                <div>
                  <strong>{t.edge.rel_type}</strong>: {t.neighbor.name ?? t.neighbor.id}{" "}
                  <span className="tiny">
                    ({t.edge.start_date ?? "?"} → {t.edge.end_date ?? "ongoing"})
                  </span>{" "}
                  <span className={`badge ${CONF_CLASS[t.edge.confidence] ?? "b-unconfirmed"}`}>
                    {t.edge.confidence}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="card">
        <h3>Connections by category</h3>
        {Object.keys(grouped).length === 0 && <p className="empty">No connections found.</p>}
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <h4>{cat} · {items.length}</h4>
            <ul className="list">
              {items.map((t) => (
                <li key={t.edge.id}>
                  <span className="badge b-type-Organization mono">{t.edge.rel_type}</span>
                  <span className="grow">{t.neighbor.name ?? t.neighbor.id}</span>
                  <span className={`badge ${CONF_CLASS[t.edge.confidence] ?? "b-unconfirmed"}`}>
                    {t.edge.confidence}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="row wrap">
          <h3 className="grow" style={{ margin: 0 }}>Network</h3>
          <button className="btn-primary btn-sm" onClick={() => api.insight(graph).then(setInsight).catch(() => {})}>
            ✦ Summarize this network
          </button>
        </div>
        {insight && (
          <div className="mt">
            <p>{insight.headline}</p>
            <h4>Facts</h4>
            <ul className="list">
              {insight.facts.map((f, i) => <li key={i} className="mono">{f.text}</li>)}
            </ul>
            <h4>Inferences · investigate, don't assume</h4>
            <ul className="list">
              {insight.inferences.map((f, i) => (
                <li key={i}><span className="badge b-inferred">{f.kind}</span> {f.text}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt">
          <GraphCanvas nodes={graph.nodes} edges={graph.edges} />
        </div>
      </div>
    </div>
  );
}
