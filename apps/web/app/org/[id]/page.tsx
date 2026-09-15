"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import GraphCanvas from "@/components/GraphCanvas";
import HierarchyTree from "@/components/HierarchyTree";
import InsightPanel from "@/components/InsightPanel";
import Nav from "@/components/Nav";
import { api, type GraphResult, type Insight, type TimelineItem, type TreeNode } from "@/lib/api";

const CONF_CLASS: Record<string, string> = {
  verified: "b-verified",
  inferred: "b-inferred",
  unconfirmed: "b-unconfirmed",
};

function EdgeList({ rows }: { rows: GraphResult["edges"] }) {
  if (rows.length === 0) return <p className="empty">None.</p>;
  return (
    <ul className="list">
      {rows.map((r) => (
        <li key={r.id}>
          <span className="badge b-type-Organization mono">{r.rel_type}</span>
          <span className="grow mono">
            {r.from_id} → {r.to_id}
          </span>
          <span className={`badge ${CONF_CLASS[r.confidence] ?? "b-unconfirmed"}`}>
            {r.confidence}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function OrgPage() {
  const params = useParams();
  const id = params.id as string;
  const [graph, setGraph] = useState<GraphResult>({ nodes: [], edges: [] });
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [ownershipTree, setOwnershipTree] = useState<TreeNode | null>(null);

  useEffect(() => {
    if (!id) return;
    api.expand(id, 1).then(setGraph).catch(() => {});
    api.timeline(id).then(setTimeline).catch(() => {});
    api.hierarchy(id, "ownership", "down").then(setOwnershipTree).catch(() => {});
  }, [id]);

  const me = graph.nodes.find((n) => n.id === id);
  const board = graph.edges.filter((e) =>
    ["director_of", "board_member_of", "chairman_of", "trustee_of"].includes(e.rel_type),
  );
  const ownership = graph.edges.filter((e) =>
    ["owns", "subsidiary_of", "invested_in", "founder_of"].includes(e.rel_type),
  );
  const people = graph.edges.filter((e) => !board.includes(e) && !ownership.includes(e));
  const attrs = (me?.attributes ?? {}) as Record<string, string>;

  return (
    <>
      <Nav />
      <main className="nw-main">
        <div className="card">
          <div className="profile-head">
            <div className="avatar org">{(me?.name ?? (id as string)).slice(0, 2).toUpperCase()}</div>
            <div>
              <h2>{me?.name ?? id}</h2>
              <p className="subtle" style={{ margin: 0 }}>
                {[attrs.industry, attrs.location].filter(Boolean).join(" · ") || "Organization"}
              </p>
            </div>
          </div>
        </div>

      <div className="card">
        <h3>Ownership hierarchy</h3>
        {!ownershipTree ? (
          <p className="empty">Loading hierarchy…</p>
        ) : ownershipTree.children.length === 0 ? (
          <p className="empty">No subsidiaries recorded — add them via + Add.</p>
        ) : (
          <HierarchyTree tree={ownershipTree} />
        )}
      </div>

      <div className="card">
        <h3>Board · {board.length}</h3>
        <EdgeList rows={board} />
      </div>

        <div className="card">
          <h3>Ownership & investments · {ownership.length}</h3>
          <EdgeList rows={ownership} />
        </div>

        <div className="card">
          <h3>Other ties · {people.length}</h3>
          <EdgeList rows={people} />
        </div>

        <div className="card">
          <h3>Timeline</h3>
          {timeline.length === 0 ? (
            <p className="empty">No dated relationships yet.</p>
          ) : (
            <ol className="timeline">
              {timeline.map((t) => (
                <li key={t.edge.id}>
                  <span className="t-date">{t.edge.start_date ?? "?"}</span>
                  <div>
                    <strong>{t.edge.rel_type}</strong>: {t.neighbor.name ?? t.neighbor.id}{" "}
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
          <div className="row wrap">
            <h3 className="grow" style={{ margin: 0 }}>
              Network intelligence
            </h3>
            <button
              className="btn-primary btn-sm"
              onClick={() => api.insight(graph).then(setInsight).catch(() => {})}
            >
              ✦ Analyze
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
