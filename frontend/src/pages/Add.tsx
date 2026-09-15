import { useState } from "react";
import { Link } from "react-router-dom";
import { api, type GraphNode, type NodeCreate, type SearchHit } from "../api";
import { NODE_TYPES, REL_CATEGORIES } from "../components/FilterPanel";

const ATTR_FIELDS: Record<string, string[]> = {
  Person: ["profession", "designation", "location"],
  Organization: ["industry", "location"],
  Family: ["location"],
  Institution: ["kind", "location"],
};

function NodePicker({
  label, value, onPick,
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
            <button type="button" className="btn-sm" onClick={search}>Find</button>
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

export default function Add() {
  // --- node form ---
  const [nType, setNType] = useState("Person");
  const [nName, setNName] = useState("");
  const [nAliases, setNAliases] = useState("");
  const [nAttrs, setNAttrs] = useState<Record<string, string>>({});
  const [nMsg, setNMsg] = useState<{ ok: boolean; text: string; id?: string; type?: string } | null>(null);

  // --- evidence form ---
  const [ev, setEv] = useState({ title: "", source_url: "", quote: "", page_ref: "", added_by: "" });
  const [evMsg, setEvMsg] = useState<{ ok: boolean; text: string; id?: string } | null>(null);

  // --- edge form ---
  const [from, setFrom] = useState<GraphNode | null>(null);
  const [to, setTo] = useState<GraphNode | null>(null);
  const [rel, setRel] = useState("employee_of");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [source, setSource] = useState("");
  const [conf, setConf] = useState("unconfirmed");
  const [note, setNote] = useState("");
  const [by, setBy] = useState("");
  const [eMsg, setEMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // --- verify form ---
  const [vEdge, setVEdge] = useState("");
  const [vActor, setVActor] = useState("");
  const [vMsg, setVMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submitNode = async () => {
    setNMsg(null);
    try {
      const attrs: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(nAttrs)) if (v.trim()) attrs[k] = v.trim();
      const created = await api.createNode({
        type: nType as NodeCreate["type"],
        name: nName.trim(),
        aliases: nAliases.split(",").map((s) => s.trim()).filter(Boolean),
        attributes: attrs,
      });
      setNMsg({ ok: true, text: `Created “${created.name}”.`, id: created.id, type: nType });
      setNName(""); setNAliases(""); setNAttrs({});
    } catch (e) {
      setNMsg({ ok: false, text: e instanceof Error ? e.message : "Create failed" });
    }
  };

  const submitEvidence = async () => {
    setEvMsg(null);
    try {
      const created = await api.createEvidence({
        title: ev.title.trim(),
        source_url: ev.source_url.trim() || null,
        quote: ev.quote.trim() || null,
        page_ref: ev.page_ref.trim() || null,
        added_by: ev.added_by.trim() || null,
      });
      setEvMsg({ ok: true, text: "Evidence saved. Use its ID as the relationship source.", id: created.id });
    } catch (e) {
      setEvMsg({ ok: false, text: e instanceof Error ? e.message : "Save failed" });
    }
  };

  const submitEdge = async () => {
    setEMsg(null);
    try {
      if (!from || !to) throw new Error("Pick both endpoint nodes first.");
      if (!source.trim()) throw new Error("A source (evidence ID) is required — every edge needs evidence.");
      await api.createEdge({
        rel_type: rel,
        from_id: from.id,
        to_id: to.id,
        start_date: start || null,
        end_date: end || null,
        source: source.trim(),
        confidence: conf as "unconfirmed" | "inferred",
        note: note.trim() || null,
        created_by: by.trim() || null,
      });
      setEMsg({ ok: true, text: `Linked ${from.name} —[${rel}]→ ${to.name}.` });
    } catch (e) {
      setEMsg({ ok: false, text: e instanceof Error ? e.message : "Link failed" });
    }
  };

  const submitVerify = async () => {
    setVMsg(null);
    try {
      if (!vEdge.trim()) throw new Error("Enter the edge ID to verify.");
      await api.setConfidence(vEdge.trim(), "verified", vActor.trim());
      setVMsg({ ok: true, text: "Edge promoted to verified." });
    } catch (e) {
      setVMsg({ ok: false, text: e instanceof Error ? e.message : "Verify failed" });
    }
  };

  return (
    <div>
      <h2>Add to the graph</h2>
      <p className="subtle">Entities first, then evidence, then relationships. Every edge needs a source.</p>

      <div className="card">
        <h3>1 · Entity</h3>
        <div className="row wrap">
          {NODE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              aria-pressed={nType === t}
              onClick={() => { setNType(t); setNAttrs({}); }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt">
          <label className="flabel">Name</label>
          <input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="e.g. N. Chandrasekaran" style={{ width: "100%" }} />
        </div>
        <div className="mt">
          <label className="flabel">Aliases (comma-separated)</label>
          <input value={nAliases} onChange={(e) => setNAliases(e.target.value)} placeholder="e.g. Natarajan Chandrasekaran" style={{ width: "100%" }} />
        </div>
        <div className="row wrap mt">
          {ATTR_FIELDS[nType].map((f) => (
            <div key={f} style={{ minWidth: 180, flex: 1 }}>
              <label className="flabel">{f}</label>
              <input
                value={nAttrs[f] ?? ""}
                onChange={(e) => setNAttrs({ ...nAttrs, [f]: e.target.value })}
                placeholder={f}
                style={{ width: "100%" }}
              />
            </div>
          ))}
        </div>
        <div className="mt">
          <button className="btn-primary" onClick={submitNode} disabled={!nName.trim()}>
            Create {nType}
          </button>
        </div>
        {nMsg && (
          <div className={nMsg.ok ? "mt" : "err"}>
            {nMsg.ok ? (
              <p>✅ {nMsg.text}{" "}
                {nMsg.id && (
                  <Link to={nMsg.type === "Organization" ? `/org/${nMsg.id}` : `/person/${nMsg.id}`}>
                    <span className="mono">{nMsg.id}</span> →
                  </Link>
                )}
              </p>
            ) : <p>{nMsg.text}</p>}
          </div>
        )}
      </div>

      <div className="card">
        <h3>2 · Evidence</h3>
        <label className="flabel">Title</label>
        <input value={ev.title} onChange={(e) => setEv({ ...ev, title: e.target.value })} placeholder="e.g. Tata Sons Annual Report 2024, p.12" style={{ width: "100%" }} />
        <div className="row wrap mt">
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="flabel">Source URL (optional)</label>
            <input value={ev.source_url} onChange={(e) => setEv({ ...ev, source_url: e.target.value })} placeholder="https://…" style={{ width: "100%" }} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label className="flabel">Page ref (optional)</label>
            <input value={ev.page_ref} onChange={(e) => setEv({ ...ev, page_ref: e.target.value })} placeholder="p.12" style={{ width: "100%" }} />
          </div>
        </div>
        <div className="mt">
          <label className="flabel">Quote (optional)</label>
          <input value={ev.quote} onChange={(e) => setEv({ ...ev, quote: e.target.value })} placeholder="Exact supporting quote…" style={{ width: "100%" }} />
        </div>
        <div className="mt">
          <label className="flabel">Added by (optional)</label>
          <input value={ev.added_by} onChange={(e) => setEv({ ...ev, added_by: e.target.value })} placeholder="you@example.com" style={{ width: "100%" }} />
        </div>
        <div className="mt">
          <button className="btn-primary" onClick={submitEvidence} disabled={!ev.title.trim()}>
            Save evidence
          </button>
        </div>
        {evMsg && (
          <div className={evMsg.ok ? "mt" : "err"}>
            {evMsg.ok && evMsg.id ? (
              <p>✅ {evMsg.text}<br />
                <span className="mono">{evMsg.id}</span>{" "}
                <button type="button" className="btn-sm" onClick={() => setSource(evMsg.id!)}>Use as source ↓</button>
              </p>
            ) : <p>{evMsg.text}</p>}
          </div>
        )}
      </div>

      <div className="card">
        <h3>3 · Relationship</h3>
        <div className="row wrap">
          <div style={{ flex: 1, minWidth: 240 }}><NodePicker label="From" value={from} onPick={setFrom} /></div>
          <div style={{ flex: 1, minWidth: 240 }}><NodePicker label="To" value={to} onPick={setTo} /></div>
        </div>
        <div className="mt">
          <label className="flabel">Relationship type</label>
          <select value={rel} onChange={(e) => setRel(e.target.value)} style={{ font: "inherit", padding: 8, borderRadius: 8, width: "100%" }}>
            {Object.entries(REL_CATEGORIES).map(([cat, rels]) => (
              <optgroup key={cat} label={cat}>
                {rels.map((r) => <option key={r} value={r}>{r}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="row wrap mt">
          <div style={{ flex: 1, minWidth: 160 }}>
            <label className="flabel">Start date</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label className="flabel">End date (blank = ongoing)</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label className="flabel">Confidence</label>
            <select value={conf} onChange={(e) => setConf(e.target.value)} style={{ font: "inherit", padding: 8, borderRadius: 8, width: "100%" }}>
              <option value="unconfirmed">unconfirmed</option>
              <option value="inferred">inferred</option>
            </select>
          </div>
        </div>
        <div className="mt">
          <label className="flabel">Source (evidence ID) — required</label>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Paste evidence ID from step 2" className="mono" style={{ width: "100%" }} />
        </div>
        <div className="row wrap mt">
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="flabel">Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Chairman since Feb 2017" style={{ width: "100%" }} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label className="flabel">Created by (optional)</label>
            <input value={by} onChange={(e) => setBy(e.target.value)} placeholder="you@example.com" style={{ width: "100%" }} />
          </div>
        </div>
        <div className="mt">
          <button className="btn-primary" onClick={submitEdge}>Create relationship</button>
        </div>
        {eMsg && (eMsg.ok ? <p className="mt">✅ {eMsg.text}</p> : <div className="err">{eMsg.text}</div>)}
      </div>

      <div className="card">
        <h3>4 · Verify (human review)</h3>
        <p className="tiny">Promotion to <span className="badge b-verified">verified</span> requires a named reviewer. AI imports always land as inferred.</p>
        <div className="row wrap">
          <div style={{ flex: 2, minWidth: 220 }}>
            <label className="flabel">Edge ID</label>
            <input value={vEdge} onChange={(e) => setVEdge(e.target.value)} placeholder="edge id" className="mono" style={{ width: "100%" }} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="flabel">Reviewer</label>
            <input value={vActor} onChange={(e) => setVActor(e.target.value)} placeholder="reviewer name / email" style={{ width: "100%" }} />
          </div>
        </div>
        <div className="mt">
          <button onClick={submitVerify}>Mark verified</button>
        </div>
        {vMsg && (vMsg.ok ? <p className="mt">✅ {vMsg.text}</p> : <div className="err">{vMsg.text}</div>)}
      </div>
    </div>
  );
}
