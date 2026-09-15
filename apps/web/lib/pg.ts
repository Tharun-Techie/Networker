import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL ?? "postgresql://networker:networker_dev@localhost:5432/networker";
    pool = new Pool({ connectionString });
  }
  return pool;
}
