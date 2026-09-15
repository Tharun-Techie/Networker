// Neo4j schema bootstrap — idempotent, safe to re-run in cypher-shell.
// Covers the core schema decision: every node has id/name/aliases +
// timestamps; every edge carries source/confidence/time bounds/provenance.
CREATE CONSTRAINT person_id_unique IF NOT EXISTS FOR (n:Person) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT org_id_unique IF NOT EXISTS FOR (n:Organization) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT family_id_unique IF NOT EXISTS FOR (n:Family) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT institution_id_unique IF NOT EXISTS FOR (n:Institution) REQUIRE n.id IS UNIQUE;
CREATE INDEX node_name_idx IF NOT EXISTS FOR (n:Person) ON (n.name);
CREATE INDEX org_name_idx IF NOT EXISTS FOR (n:Organization) ON (n.name);
CREATE FULLTEXT INDEX node_names_ft IF NOT EXISTS FOR (n:Person|Organization|Family|Institution) ON EACH [n.name, n.aliases_text];
