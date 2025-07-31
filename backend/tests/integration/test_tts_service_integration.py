"""
Integration tests for TTS service using real AWS infrastructure.

These tests require:
1. AWS credentials configured
2. The S3 bucket and IAM permissions from terraform deployed
3. Environment variables from .env.aws loaded

Run with: pytest -m integration tests/integration/
Skip with: pytest -m "not integration"
"""

import json

import anyio
import pytest

from readerai.config import get_settings
from readerai.tts import TTSBatchRequest, TTSRequest, TTSService, WordTiming

pytestmark = pytest.mark.integration


def requires_aws_infrastructure():
    """Check if AWS infrastructure is available for testing"""
    settings = get_settings()

    # Check for required AWS settings
    if not settings.aws.audio_cache_bucket:
        pytest.skip("AWS_AUDIO_CACHE_BUCKET not configured")

    # Check for AWS credentials by trying to get caller identity
    import boto3

    try:
        sts = boto3.client("sts")
        sts.get_caller_identity()
    except Exception as e:
        pytest.skip(f"AWS credentials not available: {e}")

    return settings


@pytest.mark.anyio
async def test_real_polly_synthesis():
    """Test actual synthesis with AWS Polly and S3 caching"""
    settings = requires_aws_infrastructure()
    service = TTSService(settings)

    # Use a unique test phrase to avoid collisions
    test_text = f"Integration test at {anyio.current_time()}"
    request = TTSRequest(text=test_text, voice_id="Joanna", engine="standard")

    # First synthesis - should hit Polly
    response1 = await service.synthesize(request)

    assert response1.cached is False
    assert response1.cache_key is not None
    assert response1.presigned_audio_url.startswith("https://")
    assert response1.presigned_text_url.startswith("https://")
    assert response1.presigned_timings_url.startswith("https://")

    # Verify timings were extracted
    assert response1.timings is not None
    assert len(response1.timings) > 0
    assert all(t.type == "word" for t in response1.timings)

    # Second synthesis - should hit cache
    response2 = await service.synthesize(request)

    assert response2.cached is True
    assert response2.cache_key == response1.cache_key
    assert response2.timings is None  # Not included for cached responses


@pytest.mark.anyio
async def test_presigned_url_accessibility():
    """Test that presigned URLs actually work"""
    settings = requires_aws_infrastructure()
    service = TTSService(settings)

    request = TTSRequest(text="URL test", voice_id="Joanna", engine="standard")
    response = await service.synthesize(request)

    # Use httpx to verify URLs are accessible
    import httpx

    async with httpx.AsyncClient() as client:
        # Check audio URL
        resp = await client.get(response.presigned_audio_url)
        assert resp.status_code == 200
        assert resp.headers.get("Content-Type") == "audio/mpeg"
        audio_data = resp.content
        assert len(audio_data) > 0

        # Check text URL
        resp = await client.get(response.presigned_text_url)
        assert resp.status_code == 200
        text_data = resp.json()
        assert text_data["text"] == "URL test"

        # Check timings URL
        resp = await client.get(response.presigned_timings_url)
        assert resp.status_code == 200
        timings_data = resp.json()
        assert isinstance(timings_data, list)


@pytest.mark.anyio
async def test_different_voices():
    """Test synthesis with different Polly voices"""
    settings = requires_aws_infrastructure()
    service = TTSService(settings)

    text = "Testing different voices"

    # Test with default voice
    response1 = await service.synthesize(
        TTSRequest(text=text, voice_id="Joanna", engine="standard")
    )

    # Test with different voice
    response2 = await service.synthesize(
        TTSRequest(text=text, voice_id="Matthew", engine="standard")
    )

    # Should have different cache keys
    assert response1.cache_key != response2.cache_key

    # Both should generate successfully
    assert response1.presigned_audio_url is not None
    assert response2.presigned_audio_url is not None


@pytest.mark.anyio
async def test_batch_synthesis_real():
    """Test batch synthesis with real AWS services"""
    settings = requires_aws_infrastructure()
    service = TTSService(settings)

    batch_request = TTSBatchRequest(
        items=[
            TTSRequest(
                text="First item in batch", voice_id="Joanna", engine="standard"
            ),
            TTSRequest(
                text="Second item in batch", voice_id="Joanna", engine="standard"
            ),
            TTSRequest(
                text="Third item in batch", voice_id="Joanna", engine="standard"
            ),
        ]
    )

    batch_response = await service.synthesize_batch(batch_request)

    assert len(batch_response.results) == 3

    # All should have unique cache keys
    cache_keys = {r.cache_key for r in batch_response.results}
    assert len(cache_keys) == 3

    # All should have valid URLs
    for result in batch_response.results:
        assert result.presigned_audio_url.startswith("https://")


@pytest.mark.anyio
async def test_s3_lifecycle():
    """Test that S3 objects are created with correct properties"""
    settings = requires_aws_infrastructure()
    service = TTSService(settings)

    # Create a unique test case
    import uuid

    unique_text = f"Lifecycle test {uuid.uuid4()}"
    request = TTSRequest(text=unique_text, voice_id="Joanna", engine="standard")

    response = await service.synthesize(request)

    # Use boto3 to verify S3 object properties
    import boto3

    s3 = boto3.client("s3", region_name=settings.aws.region)

    # Check audio object
    audio_obj = s3.head_object(
        Bucket=settings.aws.audio_cache_bucket, Key=response.audio_key
    )
    assert audio_obj["ContentType"] == "audio/mpeg"
    assert audio_obj["StorageClass"] == "ONEZONE_IA"

    # Check text object
    text_obj = s3.head_object(
        Bucket=settings.aws.audio_cache_bucket, Key=response.text_key
    )
    assert text_obj["ContentType"] == "application/json"

    # Verify text content
    text_content = s3.get_object(
        Bucket=settings.aws.audio_cache_bucket, Key=response.text_key
    )
    text_data = json.loads(text_content["Body"].read())
    assert text_data["text"] == unique_text


@pytest.mark.anyio
async def test_word_timing_accuracy():
    """Test that word timings align with actual speech"""
    settings = requires_aws_infrastructure()
    service = TTSService(settings)

    # Use a unique sentence to ensure we get fresh synthesis
    import time

    request = TTSRequest(
        text=f"Hello world. This is test number {int(time.time())}.",
        voice_id="Joanna",
        engine="standard",
    )

    response = await service.synthesize(request)

    # If cached, we need to fetch timings from URL
    if response.cached:
        import httpx

        async with httpx.AsyncClient() as client:
            resp = await client.get(response.presigned_timings_url)
            timings_data = resp.json()
            timings = [WordTiming(**t) for t in timings_data]
    else:
        assert response.timings is not None
        timings = response.timings

    # Verify timing properties
    words = [t.value for t in timings]
    # We can't assert exact words since we added a timestamp
    assert "Hello" in words
    assert "world" in words
    assert "This" in words
    assert "is" in words
    assert "test" in words

    # Verify timings are monotonically increasing
    times = [t.time for t in timings]
    assert all(times[i] < times[i + 1] for i in range(len(times) - 1))

    # Verify byte positions make sense
    for timing in timings:
        assert timing.start < timing.end
        assert timing.type == "word"


# Utility functions for test data cleanup
async def cleanup_test_objects(bucket: str, prefix: str = "polly/"):
    """Clean up test objects from S3 (run manually if needed)"""
    import boto3

    s3 = boto3.client("s3")

    paginator = s3.get_paginator("list_objects_v2")
    pages = paginator.paginate(Bucket=bucket, Prefix=prefix)

    objects_to_delete = []
    for page in pages:
        if "Contents" in page:
            for obj in page["Contents"]:
                # Only delete objects created by tests (optional filter)
                if "test" in obj["Key"].lower():
                    objects_to_delete.append({"Key": obj["Key"]})

    if objects_to_delete:
        s3.delete_objects(Bucket=bucket, Delete={"Objects": objects_to_delete})
        print(f"Deleted {len(objects_to_delete)} test objects")
