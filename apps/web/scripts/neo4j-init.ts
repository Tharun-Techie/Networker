/** Applies Neo4j constraints/indexes — idempotent. Run: npm run db:init */
import { runWrite } from "../lib/neo4j";

const STATEMENTS = [
  "CREATE CONSTRAINT person_id_unique IF NOT EXISTS FOR (n:Person) REQUIRE n.id IS UNIQUE",
  "CREATE CONSTRAINT org_id_unique IF NOT EXISTS FOR (n:Organization) REQUIRE n.id IS UNIQUE",
  "CREATE CONSTRAINT family_id_unique IF NOT EXISTS FOR (n:Family) REQUIRE n.id IS UNIQUE",
  "CREATE CONSTRAINT institution_id_unique IF NOT EXISTS FOR (n:Institution) REQUIRE n.id IS UNIQUE",
  "CREATE INDEX node_name_idx IF NOT EXISTS FOR (n:Person) ON (n.name)",
  "CREATE INDEX org_name_idx IF NOT EXISTS FOR (n:Organization) ON (n.name)",
  "CREATE FULLTEXT INDEX node_names_ft IF NOT EXISTS FOR (n:Person|Organization|Family|Institution) ON EACH [n.name, n.aliases_text]",
];

async function main() {
  for (const q of STATEMENTS) {
    await runWrite(q);
    console.log("ok:", q.slice(0, 60));
  }
  const { closeDriver } = await import("../lib/neo4j");
  await closeDriver();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
