/**
 * Demo seed — Tata-ecosystem subgraph from the product concept.
 * Idempotent (MERGE by id). Run: npm run db:seed
 * Demo data for local exploration only.
 */
import { runWrite } from "../lib/neo4j";
import { closeDriver } from "../lib/neo4j";

interface SeedNode {
  id: string;
  label: "Person" | "Organization" | "Family" | "Institution";
  name: string;
  aliases?: string[];
  attributes?: Record<string, string>;
}

interface SeedEdge {
  id: string;
  rel: string;
  from: string;
  to: string;
  start?: string | null;
  end?: string | null;
  note?: string | null;
}

const NODES: SeedNode[] = [
  {
    id: "person-n-chandrasekaran",
    label: "Person",
    name: "N. Chandrasekaran",
    aliases: ["Natarajan Chandrasekaran", "N Chandrasekaran"],
    attributes: { profession: "Executive", designation: "Chairman", location: "Mumbai" },
  },
  {
    id: "person-ratan-tata",
    label: "Person",
    name: "Ratan Tata",
    attributes: { profession: "Industrialist", designation: "Chairman Emeritus", location: "Mumbai" },
  },
  { id: "family-tata", label: "Family", name: "Tata family", attributes: { location: "Mumbai" } },
  {
    id: "org-tata-sons",
    label: "Organization",
    name: "Tata Sons",
    attributes: { industry: "Holding", location: "Mumbai" },
  },
  {
    id: "org-tata-motors",
    label: "Organization",
    name: "Tata Motors",
    attributes: { industry: "Automotive", location: "Mumbai" },
  },
  {
    id: "org-tcs",
    label: "Organization",
    name: "TCS",
    aliases: ["Tata Consultancy Services"],
    attributes: { industry: "IT Services", location: "Mumbai" },
  },
  {
    id: "org-tata-steel",
    label: "Organization",
    name: "Tata Steel",
    attributes: { industry: "Steel", location: "Mumbai" },
  },
  {
    id: "org-tata-capital",
    label: "Organization",
    name: "Tata Capital",
    attributes: { industry: "Financial Services", location: "Mumbai" },
  },
];

const EDGES: SeedEdge[] = [
  { id: "edge-chandra-tcs", rel: "employee_of", from: "person-n-chandrasekaran", to: "org-tcs", start: "1987-01-01", end: "2017-02-20", note: "Joined TCS 1987, CEO 2009-2017" },
  { id: "edge-chandra-sons", rel: "chairman_of", from: "person-n-chandrasekaran", to: "org-tata-sons", start: "2017-02-21", note: "Chairman, Tata Sons" },
  { id: "edge-chandra-motors", rel: "director_of", from: "person-n-chandrasekaran", to: "org-tata-motors", start: "2017-01-01" },
  { id: "edge-chandra-steel", rel: "director_of", from: "person-n-chandrasekaran", to: "org-tata-steel", start: "2017-01-01" },
  { id: "edge-sons-motors", rel: "owns", from: "org-tata-sons", to: "org-tata-motors" },
  { id: "edge-sons-tcs", rel: "owns", from: "org-tata-sons", to: "org-tcs" },
  { id: "edge-sons-capital", rel: "owns", from: "org-tata-sons", to: "org-tata-capital" },
  { id: "edge-sons-steel", rel: "owns", from: "org-tata-sons", to: "org-tata-steel" },
  { id: "edge-ratan-family", rel: "associated_with", from: "person-ratan-tata", to: "family-tata" },
  { id: "edge-ratan-sons", rel: "chairman_of", from: "person-ratan-tata", to: "org-tata-sons", start: "1991-01-01", end: "2012-12-28", note: "Former chairman" },
];

async function main() {
  for (const n of NODES) {
    const aliases = n.aliases ?? [];
    await runWrite(
      `MERGE (x:\`${n.label}\` {id: $id}) SET x.name = $name, x.aliases = $aliases, ` +
        `x.aliases_text = $aliases_text, x.attributes_json = $attributes_json`,
      {
        id: n.id,
        name: n.name,
        aliases,
        aliases_text: [n.name, ...aliases].join(" "),
        attributes_json: JSON.stringify(n.attributes ?? {}),
      },
    );
  }
  console.log(`nodes: ${NODES.length}`);
  for (const e of EDGES) {
    await runWrite(
      `MATCH (a {id: $from}), (b {id: $to}) MERGE (a)-[r:\`${e.rel}\` {id: $eid}] ` +
        `SET r.start_date = $start, r.end_date = $end, r.source = 'seed-demo', ` +
        `r.confidence = 'verified', r.note = $note`,
      {
        from: e.from,
        to: e.to,
        eid: e.id,
        start: e.start ?? null,
        end: e.end ?? null,
        note: e.note ?? null,
      },
    );
  }
  console.log(`edges: ${EDGES.length}`);
  await closeDriver();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
