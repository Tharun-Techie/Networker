import { ApiError, toResponse } from "@/lib/api-error";
import { presignedUploadUrl } from "@/lib/s3";

export const runtime = "nodejs";

/** Step 1 of evidence upload: presigned PUT URL for direct-to-S3 bytes. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { filename?: string; content_type?: string };
    if (!body.filename) throw new ApiError(400, "filename is required");
    return Response.json(await presignedUploadUrl(body.filename, body.content_type));
  } catch (err) {
    if (err instanceof Error && /S3 (unavailable|not configured)/.test(err.message)) {
      return Response.json({ detail: err.message }, { status: 503 });
    }
    return toResponse(err);
  }
}
