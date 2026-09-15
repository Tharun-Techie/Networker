/** Central API error with an HTTP status (parity with the FastAPI error model). */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function unavailable(service: string, detail: unknown): ApiError {
  const msg = detail instanceof Error ? detail.message : String(detail);
  return new ApiError(503, `${service} unavailable: ${msg}`);
}

export function badRequest(message: string): ApiError {
  return new ApiError(400, message);
}

export function notFound(message: string): ApiError {
  return new ApiError(404, message);
}

export function toResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json({ detail: err.message }, { status: err.status });
  }
  console.error(err);
  return Response.json({ detail: "Internal Server Error" }, { status: 500 });
}

/**
 * Graph/search routes degrade to 503 (never crash) when Neo4j/OpenSearch are
 * unreachable — parity with the FastAPI `get_driver() is None → 503` model.
 */
export function toGraphResponse(err: unknown): Response {
  if (err instanceof ApiError) return toResponse(err);
  const message = err instanceof Error ? err.message : String(err);
  if (/unavailable|connect|closed|ECONNREFUSED/i.test(message)) {
    return Response.json({ detail: message }, { status: 503 });
  }
  return toResponse(err);
}
