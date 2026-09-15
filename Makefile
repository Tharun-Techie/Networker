.PHONY: up up-search down backend-test frontend-dev seed

up:
	docker compose up --build

up-search:
	docker compose --profile search up --build

down:
	docker compose down -v

backend-test:
	cd backend && pytest -q

worker:
	cd backend && arq app.worker.WorkerSettings

frontend-dev:
	cd frontend && npm install && npm run dev

# Applies Neo4j constraints/indexes from backend/neo4j_init.cypher
seed-neo4j:
	cat backend/neo4j_init.cypher | cypher-shell -a $${NEO4J_URI:-bolt://localhost:7687} -u $${NEO4J_USER:-neo4j} -p $${NEO4J_PASSWORD:-networker_dev_pw}
