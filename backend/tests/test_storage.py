from unittest.mock import MagicMock, patch

import pytest

from app.services import storage


@pytest.fixture
def fake_boto3():
    client = MagicMock()
    client.generate_presigned_url.return_value = "https://s3.example/put?sig=abc"
    with patch("boto3.client", return_value=client) as mock_client:
        storage.get_client.cache_clear()
        yield mock_client, client
        storage.get_client.cache_clear()


def test_presigned_upload_url(fake_boto3):
    _, client = fake_boto3
    out = storage.presigned_upload_url("annual report 2023.pdf", "application/pdf")
    assert out["key"].startswith("evidence/")
    assert out["key"].endswith(".pdf")
    assert out["url"].startswith("https://")
    assert client.generate_presigned_url.called


def test_presigned_url_s3_failure_is_503():
    with patch("boto3.client", side_effect=Exception("connection refused")):
        storage.get_client.cache_clear()
        try:
            with pytest.raises(RuntimeError, match="S3 unavailable"):
                storage.presigned_upload_url("x.pdf")
        finally:
            storage.get_client.cache_clear()


def test_new_key_sanitizes_filename():
    assert storage.new_key("../../etc/passwd").endswith("passwd")
    key = storage.new_key("a/b")
    assert key.count("/") == 2  # only the evidence/<uuid>/ separators
    assert ".." not in key
