"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { REL_CATEGORIES } from "@networker/shared";
import GraphCanvas from "@/components/GraphCanvas";
import InsightPanel from "@/components/InsightPanel";
import Nav from "@/components/Nav";
import { api, type GraphResult, type Insight, type TimelineItem } from "@/lib/api";

const CONF_CLASS: Record<string, string> = {
  verified: "b-verified",
  inferred: "b-inferred",
  unconfirmed: "b-unconfirmed",
};

function categoryOf(rel: string): string {
  for (const [cat, rels] of Object.entries(REL_CATEGORIES))
    if ((rels as readonly string[]).includes(rel)) return cat;
  return "other";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function PersonPage() {
  const params = useParams();
  const id = params.id as string;
  const [graph, setGraph] = useState<GraphResult>({ nodes: [], edges: [] });
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [insight, setInsight] = useState<Insight | null>(null);

  useEffect(() => {
    if (!id) return;
    api.expand(id, 1).then(setGraph).catch(() => {});
    api.timeline(id).then(setTimeline).catch(() => {});
  }, [id]);

  const me = graph.nodes.find((n) => n.id === id);
  const grouped: Record<string, typeof timeline> = {};
  for (const t of timeline) {
    const c = categoryOf(t.edge.rel_type);
    (grouped[c] ??= []).push(t);
  }
  const attrs = (me?.attributes ?? {}) as Record<string, string>;

  return (
    <>
      <Nav />
      <main className="nw-main">
        <div className="card">
          <div className="profile-head">
            <div className="avatar">{initials(me?.name ?? (id as string))}</div>
            <div>
              <h2>{me?.name ?? id}</h2>
              <p className="subtle" style={{ margin: 0 }}>
                {[attrs.designation, attrs.profession, attrs.location].filter(Boolean).join(" · ") ||
                  "Person"}
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
              <h4>
                {cat} · {items.length}
              </h4>
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
            <h3 className="grow" style={{ margin: 0 }}>
              Network
            </h3>
            <button
              className="btn-primary btn-sm"
              onClick={() => api.insight(graph).then(setInsight).catch(() => {})}
            >
              ✦ Summarize this network
            </button>
          </div>
          {insight && (
            <div className="mt">
              <InsightPanel insight={insight} />
            </div>
          )}
          <div className="mt">
            <GraphCanvas nodes={graph.nodes} edges={graph.edges} />
          </div>
        </div>
      </main>
    </>
  );
}
