import { randomUUID } from "node:crypto";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getClient(): S3Client {
  const endpoint = process.env.S3_ENDPOINT_URL;
  if (!endpoint) throw new Error("S3 not configured");
  return new S3Client({
    endpoint,
    forcePathStyle: true,
    region: process.env.S3_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "",
    },
  });
}

export function bucket(): string {
  return process.env.S3_BUCKET ?? "networker-evidence";
}

export function newKey(filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "").replace(/^[._]+/, "") || "file";
  return `evidence/${randomUUID()}/${safe}`;
}

/**
 * Presigned PUT URL flow (parity with the FastAPI evidence layer): the client
 * uploads bytes straight to S3, then POSTs the metadata with the returned key.
 * Throws when S3 is unreachable so routes can return 503.
 */
export async function presignedUploadUrl(
  filename: string,
  contentType = "application/octet-stream",
  expiresIn = 3600,
): Promise<{ key: string; url: string; bucket: string; expires_in: number }> {
  const key = newKey(filename);
  try {
    const client = getClient();
    const targetBucket = bucket();
    try {
      await client.send(new HeadBucketCommand({ Bucket: targetBucket }));
    } catch {
      await client.send(new CreateBucketCommand({ Bucket: targetBucket }));
    }
    const url = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: targetBucket, Key: key, ContentType: contentType }),
      { expiresIn },
    );
    return { key, url, bucket: targetBucket, expires_in: expiresIn };
  } catch (err) {
    throw new Error(`S3 unavailable: ${err instanceof Error ? err.message : String(err)}`);
  }
}
