"use client";

import { useState } from "react";
import { api, type GraphNode, type SearchHit } from "@/lib/api";

export default function NodePicker({
  label,
  value,
  onPick,
}: {
  label: string;
  value: GraphNode | null;
  onPick: (n: GraphNode | null) => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const search = async () => {
    if (!q.trim()) return;
    try {
      setHits(await api.search(q));
    } catch {
      /* ignore */
    }
  };
  return (
    <div>
      <label className="flabel">{label}</label>
      {value ? (
        <div className="row wrap">
          <span className="badge b-type-Organization">{value.name}</span>
          <span className="tiny mono">{value.id}</span>
          <button type="button" className="btn-sm btn-ghost" onClick={() => onPick(null)}>
            change
          </button>
        </div>
      ) : (
        <>
          <div className="searchbar">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder={`Search ${label.toLowerCase()}…`}
            />
            <button type="button" className="btn-sm" onClick={search}>
              Find
            </button>
          </div>
          {hits.length > 0 && (
            <ul className="list">
              {hits.map((h) => (
                <li key={h.id}>
                  <span className={`badge b-type-${h.label}`}>{h.label}</span>
                  <span className="grow">{h.name}</span>
                  <button
                    type="button"
                    className="btn-sm"
                    onClick={() => {
                      onPick({ id: h.id, name: h.name, label: h.label });
                      setHits([]);
                      setQ("");
                    }}
                  >
                    Use
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
