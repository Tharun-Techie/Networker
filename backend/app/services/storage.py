"""S3 object storage seam (S3 or MinIO): source documents backing the evidence layer.

Flow: client asks for a presigned PUT URL -> uploads bytes directly to S3 ->
creates the Postgres evidence row with the returned key. The graph only ever
stores the evidence ID, never the bytes.
"""

import uuid
from functools import lru_cache

from app.config import settings


@lru_cache(maxsize=1)
def get_client():
    import boto3

    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name="us-east-1",
    )


def new_key(filename: str) -> str:
    safe = "".join(c for c in filename if c.isalnum() or c in "._-").strip("._") or "file"
    return f"evidence/{uuid.uuid4()}/{safe}"


def presigned_upload_url(filename: str, content_type: str = "application/octet-stream",
                         expires_in: int = 3600) -> dict:
    """Presigned PUT URL. Raises RuntimeError when S3 is unreachable."""
    key = new_key(filename)
    try:
        client = get_client()
        try:
            client.head_bucket(Bucket=settings.s3_bucket)
        except Exception:
            client.create_bucket(Bucket=settings.s3_bucket)
        url = client.generate_presigned_url(
            "put_object",
            Params={"Bucket": settings.s3_bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=expires_in,
        )
    except Exception as exc:
        raise RuntimeError(f"S3 unavailable: {exc}")
    return {"key": key, "url": url, "bucket": settings.s3_bucket, "expires_in": expires_in}
