import neo4j, { type Driver } from "neo4j-driver";

let driver: Driver | null = null;
let lastError: string | null = null;

export function driverError(): string | null {
  return lastError;
}

/** Lazily verified driver singleton (graceful degradation like the FastAPI app). */
export async function getDriver(): Promise<Driver | null> {
  if (driver) return driver;
  try {
    const uri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
    const user = process.env.NEO4J_USER ?? "neo4j";
    const password = process.env.NEO4J_PASSWORD ?? "networker_dev_pw";
    const d = neo4j.driver(uri, neo4j.auth.basic(user, password));
    await d.verifyConnectivity();
    driver = d;
    lastError = null;
    return driver;
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

export async function runRead(
  query: string,
  params: Record<string, unknown> = {},
): Promise<Array<Record<string, unknown>>> {
  const d = await getDriver();
  if (!d) throw new Error(`Neo4j unavailable: ${driverError()}`);
  const session = d.session();
  try {
    const res = await session.run(query, params);
    return res.records.map((r) => r.toObject() as Record<string, unknown>);
  } catch (err) {
    // Drop the cached driver on connectivity failures so the next call retries.
    if (err instanceof Error && /connect|connection|closed|unavailable|broken/i.test(err.message)) {
      try {
        await d.close();
      } catch {
        /* ignore */
      }
      if (driver === d) driver = null;
    }
    throw err;
  } finally {
    await session.close();
  }
}

export async function runWrite(
  query: string,
  params: Record<string, unknown> = {},
): Promise<Array<Record<string, unknown>>> {
  // Single-statement autocommit write, consumed inside the session scope.
  return runRead(query, params);
}
