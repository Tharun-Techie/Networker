// MVP demo seed — illustrative Tata-ecosystem subgraph from the product concept.
// Idempotent (MERGE-based). Load via:
//   cypher-shell -a $NEO4J_URI -u $NEO4J_USER -p $NEO4J_PASSWORD -f backend/seed_tata.cypher
// Demo data for local exploration only — verify against real sources before use.
// NOTE: Neo4j cannot store map properties, so attributes live as a JSON
// string (attributes_json); the API decodes it back to `attributes`.

MERGE (chandra:Person {id: 'person-n-chandrasekaran'})
SET chandra.name = 'N. Chandrasekaran',
    chandra.aliases = ['Natarajan Chandrasekaran', 'N Chandrasekaran'],
    chandra.aliases_text = 'N. Chandrasekaran Natarajan Chandrasekaran N Chandrasekaran',
    chandra.attributes_json = '{"profession": "Executive", "designation": "Chairman", "location": "Mumbai"}';

MERGE (ratan:Person {id: 'person-ratan-tata'})
SET ratan.name = 'Ratan Tata',
    ratan.aliases = [],
    ratan.aliases_text = 'Ratan Tata',
    ratan.attributes_json = '{"profession": "Industrialist", "designation": "Chairman Emeritus", "location": "Mumbai"}';

MERGE (fam:Family {id: 'family-tata'})
SET fam.name = 'Tata family', fam.aliases_text = 'Tata family',
    fam.attributes_json = '{"location": "Mumbai"}';

MERGE (sons:Organization {id: 'org-tata-sons'})
SET sons.name = 'Tata Sons', sons.aliases_text = 'Tata Sons',
    sons.attributes_json = '{"industry": "Holding", "location": "Mumbai"}';

MERGE (motors:Organization {id: 'org-tata-motors'})
SET motors.name = 'Tata Motors', motors.aliases_text = 'Tata Motors',
    motors.attributes_json = '{"industry": "Automotive", "location": "Mumbai"}';

MERGE (tcs:Organization {id: 'org-tcs'})
SET tcs.name = 'TCS', tcs.aliases = ['Tata Consultancy Services'],
    tcs.aliases_text = 'TCS Tata Consultancy Services',
    tcs.attributes_json = '{"industry": "IT Services", "location": "Mumbai"}';

MERGE (steel:Organization {id: 'org-tata-steel'})
SET steel.name = 'Tata Steel', steel.aliases_text = 'Tata Steel',
    steel.attributes_json = '{"industry": "Steel", "location": "Mumbai"}';

MERGE (capital:Organization {id: 'org-tata-capital'})
SET capital.name = 'Tata Capital', capital.aliases_text = 'Tata Capital',
    capital.attributes_json = '{"industry": "Financial Services", "location": "Mumbai"}';

// Career chain: TCS (1987) -> TCS CEO -> Tata Sons Chairman
MERGE (chandra)-[e1:employee_of]->(tcs)
SET e1.id = 'edge-chandra-tcs', e1.start_date = '1987-01-01', e1.end_date = '2017-02-20',
    e1.source = 'seed-demo', e1.confidence = 'verified', e1.note = 'Joined TCS 1987, CEO 2009-2017',
    e1.created_at = datetime();
MERGE (chandra)-[e2:chairman_of]->(sons)
SET e2.id = 'edge-chandra-sons', e2.start_date = '2017-02-21', e2.end_date = NULL,
    e2.source = 'seed-demo', e2.confidence = 'verified', e2.note = 'Chairman, Tata Sons',
    e2.created_at = datetime();
MERGE (chandra)-[e3:director_of]->(motors)
SET e3.id = 'edge-chandra-motors', e3.start_date = '2017-01-01', e3.end_date = NULL,
    e3.source = 'seed-demo', e3.confidence = 'verified', e3.created_at = datetime();
MERGE (chandra)-[e4:director_of]->(steel)
SET e4.id = 'edge-chandra-steel', e4.start_date = '2017-01-01', e4.end_date = NULL,
    e4.source = 'seed-demo', e4.confidence = 'verified', e4.created_at = datetime();

// Ownership spine
MERGE (sons)-[o1:owns]->(motors)
SET o1.id = 'edge-sons-motors', o1.source = 'seed-demo', o1.confidence = 'verified',
    o1.created_at = datetime();
MERGE (sons)-[o2:owns]->(tcs)
SET o2.id = 'edge-sons-tcs', o2.source = 'seed-demo', o2.confidence = 'verified',
    o2.created_at = datetime();
MERGE (sons)-[o3:owns]->(capital)
SET o3.id = 'edge-sons-capital', o3.source = 'seed-demo', o3.confidence = 'verified',
    o3.created_at = datetime();
MERGE (sons)-[o4:owns]->(steel)
SET o4.id = 'edge-sons-steel', o4.source = 'seed-demo', o4.confidence = 'verified',
    o4.created_at = datetime();

// Family layer
MERGE (ratan)-[f1:associated_with]->(fam)
SET f1.id = 'edge-ratan-family', f1.source = 'seed-demo', f1.confidence = 'verified',
    f1.created_at = datetime();
MERGE (ratan)-[f2:chairman_of]->(sons)
SET f2.id = 'edge-ratan-sons', f2.start_date = '1991-01-01', f2.end_date = '2012-12-28',
    f2.source = 'seed-demo', f2.confidence = 'verified', f2.note = 'Former chairman',
    f2.created_at = datetime();
