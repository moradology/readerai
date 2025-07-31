"""
Integration test that produces TTS audio and verifies it can be played.

This test:
1. Synthesizes audio using AWS Polly
2. Downloads the audio from presigned URL
3. Validates the audio file format and playability
4. Optionally plays the audio if running in interactive mode

Run with: pytest -m integration tests/integration/test_tts_audio_playback.py
Interactive mode: pytest -m integration tests/integration/test_tts_audio_playback.py -s
"""

import tempfile
import time
from pathlib import Path

import httpx
import pytest

from readerai.config import get_settings
from readerai.tts import TTSRequest, TTSService

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
async def test_produce_and_validate_audio():
    """Test that we can produce audio and validate it's playable"""
    settings = requires_aws_infrastructure()
    service = TTSService(settings)

    # Test text that's fun to hear
    test_text = "Hello! This is a test of the ReaderAI text-to-speech system. If you can hear this, the integration is working perfectly!"
    request = TTSRequest(text=test_text, voice_id="Joanna", engine="standard")

    # Synthesize
    response = await service.synthesize(request)

    # Download audio from presigned URL
    async with httpx.AsyncClient() as client:
        audio_response = await client.get(response.presigned_audio_url)
        assert audio_response.status_code == 200
        audio_data = audio_response.content

    # Validate audio file
    assert len(audio_data) > 1000  # Should be at least 1KB
    assert audio_data[:3] == b"ID3" or audio_data[:2] == b"\xff\xfb"  # MP3 magic bytes

    # Save to temp file for analysis
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp.write(audio_data)
        temp_path = Path(tmp.name)

    try:
        # Validate file size
        file_size = temp_path.stat().st_size
        print(f"\n✓ Audio file size: {file_size:,} bytes")

        # Try to load audio metadata (requires mutagen)
        try:
            from mutagen.mp3 import MP3

            audio = MP3(str(temp_path))
            duration = audio.info.length
            bitrate = audio.info.bitrate
            print(f"✓ Duration: {duration:.2f} seconds")
            print(f"✓ Bitrate: {bitrate:,} bps")

            # Sanity checks
            assert duration > 0.5  # Should be at least half a second
            assert duration < 30  # Shouldn't be too long for this text
            assert bitrate > 0
        except ImportError:
            print("! Install mutagen for audio metadata validation: uv add mutagen")

        # Check word timings
        assert response.timings is not None or response.cached
        if response.timings:
            print(f"✓ Word timings: {len(response.timings)} words")
            # Verify first and last words
            words = [t.value for t in response.timings]
            assert "Hello" in words[0]  # First word should be Hello
            assert "perfectly" in words[-1] or "perfectly!" in words[-1]

        return temp_path, audio_data

    finally:
        # Clean up only if not returning the path
        pass


@pytest.mark.anyio
async def test_different_voices_produce_different_audio():
    """Test that different voices produce different audio files"""
    settings = requires_aws_infrastructure()
    service = TTSService(settings)

    test_text = "Testing voice variations"

    # Synthesize with two different voices
    response1 = await service.synthesize(
        TTSRequest(text=test_text, voice_id="Joanna", engine="standard")
    )
    response2 = await service.synthesize(
        TTSRequest(text=test_text, voice_id="Matthew", engine="standard")
    )

    # Download both audio files
    async with httpx.AsyncClient() as client:
        audio1_response = await client.get(response1.presigned_audio_url)
        audio2_response = await client.get(response2.presigned_audio_url)

        audio1_data = audio1_response.content
        audio2_data = audio2_response.content

    # Files should be different
    assert audio1_data != audio2_data
    assert len(audio1_data) > 1000
    assert len(audio2_data) > 1000

    # Cache keys should be different
    assert response1.cache_key != response2.cache_key

    print(f"\n✓ Joanna voice: {len(audio1_data):,} bytes")
    print(f"✓ Matthew voice: {len(audio2_data):,} bytes")


@pytest.mark.anyio
@pytest.mark.audio
@pytest.mark.parametrize(
    "engine,voice",
    [
        ("standard", "Joanna"),
        ("neural", "Joanna"),
        ("standard", "Matthew"),
        ("neural", "Matthew"),
    ],
)
async def test_play_synthesized_audio(play_audio, engine, voice):
    """Play audio with different engines - runs with --play-audio flag"""
    if not play_audio:
        pytest.skip("Use --play-audio flag to hear synthesized audio")

    settings = requires_aws_infrastructure()
    service = TTSService(settings)

    # Fun text to listen to
    test_text = f"""
    This is {voice} speaking with the {engine} engine.
    Welcome to ReaderAI! I'm excited to help you learn.
    Tommy the Turtle loved to explore the garden.
    """

    request = TTSRequest(text=test_text, voice_id=voice, engine=engine)
    response = await service.synthesize(request)

    # Download audio
    async with httpx.AsyncClient() as client:
        audio_response = await client.get(response.presigned_audio_url)
        audio_data = audio_response.content

    # Save to temp file
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp.write(audio_data)
        temp_path = Path(tmp.name)

    try:
        print(f"\n🔊 Playing audio ({len(audio_data):,} bytes)...")
        print(f"   Voice: {voice}")
        print(f"   Engine: {engine}")
        print(f"   Cached: {response.cached}")

        # Try different audio players
        import platform
        import subprocess

        system = platform.system()
        if system == "Darwin":  # macOS
            subprocess.run(["afplay", str(temp_path)])
        elif system == "Linux":
            # Try multiple players
            for player in ["aplay", "mpg123", "ffplay"]:
                try:
                    subprocess.run([player, str(temp_path)])
                    break
                except FileNotFoundError:
                    continue
        elif system == "Windows":
            # Windows Media Player
            subprocess.run(["start", "", str(temp_path)], shell=True)

        print("✓ Audio playback complete!")

    finally:
        temp_path.unlink()


@pytest.mark.anyio
@pytest.mark.audio
async def test_compare_engines(play_audio):
    """Compare standard vs neural engines with the same text"""
    if not play_audio:
        pytest.skip("Use --play-audio flag to hear synthesized audio")

    settings = requires_aws_infrastructure()
    service = TTSService(settings)

    # Same text for both engines
    test_text = """
    The quick brown fox jumps over the lazy dog.
    This sentence contains every letter of the alphabet.
    Listen carefully to hear the difference in quality.
    """

    print("\n🎯 Comparing TTS Engines:")
    print("=" * 50)

    for engine in ["standard", "neural"]:
        request = TTSRequest(text=test_text, voice_id="Joanna", engine=engine)
        response = await service.synthesize(request)

        # Download audio
        async with httpx.AsyncClient() as client:
            audio_response = await client.get(response.presigned_audio_url)
            audio_data = audio_response.content

        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp.write(audio_data)
            temp_path = Path(tmp.name)

        try:
            print(f"\n🔊 Playing {engine.upper()} engine:")
            print(f"   Size: {len(audio_data):,} bytes")
            print(f"   Cached: {response.cached}")

            # Play audio
            import platform
            import subprocess

            system = platform.system()
            if system == "Darwin":  # macOS
                subprocess.run(["afplay", str(temp_path)])

            # Brief pause between samples
            time.sleep(1)

        finally:
            temp_path.unlink()

    print("\n✅ Engine comparison complete!")


@pytest.mark.anyio
async def test_batch_audio_production():
    """Test producing multiple audio files in a batch"""
    settings = requires_aws_infrastructure()
    service = TTSService(settings)

    # Multiple sentences to synthesize
    from readerai.tts import TTSBatchRequest

    batch = TTSBatchRequest(
        items=[
            TTSRequest(
                text="First sentence for batch synthesis.",
                voice_id="Joanna",
                engine="standard",
            ),
            TTSRequest(
                text="Second sentence with different content.",
                voice_id="Joanna",
                engine="standard",
            ),
            TTSRequest(
                text="Third and final sentence in the batch.",
                voice_id="Joanna",
                engine="standard",
            ),
        ]
    )

    batch_response = await service.synthesize_batch(batch)

    # Verify all were synthesized
    assert len(batch_response.results) == 3

    # Download and validate each audio file
    async with httpx.AsyncClient() as client:
        for i, result in enumerate(batch_response.results):
            audio_response = await client.get(result.presigned_audio_url)
            assert audio_response.status_code == 200

            audio_data = audio_response.content
            assert len(audio_data) > 1000

            print(f"\n✓ Batch item {i + 1}: {len(audio_data):,} bytes")
            if not result.cached:
                assert result.timings is not None
                print(f"  Words: {len(result.timings)}")


if __name__ == "__main__":
    # Allow running directly with audio playback
    pytest.main([__file__, "-v", "-s", "--play-audio"])
