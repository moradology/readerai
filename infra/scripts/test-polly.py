#!/usr/bin/env python3
"""
Test script for AWS Polly integration
Tests both direct Polly synthesis and cached audio retrieval
"""

import hashlib
import time

import boto3


class PollyTester:
    def __init__(self, bucket_name: str, region: str = "us-east-1"):
        self.polly = boto3.client("polly", region_name=region)
        self.s3 = boto3.client("s3", region_name=region)
        self.bucket_name = bucket_name

    def generate_cache_key(self, text: str, voice_id: str = "Joanna") -> str:
        """Generate consistent cache key for text + voice combination"""
        return hashlib.sha256(f"{text}:{voice_id}".encode()).hexdigest()

    def synthesize_speech(self, text: str, voice_id: str = "Joanna") -> dict:
        """Synthesize speech using Polly and cache in S3"""
        cache_key = self.generate_cache_key(text, voice_id)
        s3_key = f"polly/{voice_id}/{cache_key}.mp3"

        # Check if already cached
        try:
            self.s3.head_object(Bucket=self.bucket_name, Key=s3_key)
            print(f"✅ Found cached audio: s3://{self.bucket_name}/{s3_key}")
            return {"cached": True, "s3_key": s3_key, "cache_key": cache_key}
        except Exception:
            print("🔄 Generating new audio with Polly...")

        # Generate with Polly
        start_time = time.time()
        response = self.polly.synthesize_speech(
            Text=text,
            VoiceId=voice_id,
            OutputFormat="mp3",
            Engine="standard",  # or 'neural' for higher quality
        )

        # Store in S3
        self.s3.put_object(
            Bucket=self.bucket_name,
            Key=s3_key,
            Body=response["AudioStream"].read(),
            ContentType="audio/mpeg",
            StorageClass="ONEZONE_IA",
        )

        generation_time = time.time() - start_time
        print(f"✅ Generated and cached in {generation_time:.2f} seconds")

        return {
            "cached": False,
            "s3_key": s3_key,
            "cache_key": cache_key,
            "generation_time": generation_time,
        }


def main():
    # Test texts
    test_samples = [
        {
            "name": "Short sentence",
            "text": "Hello, welcome to ReaderAI. This is a test of AWS Polly integration.",
        },
        {
            "name": "Paragraph",
            "text": """Once upon a time, in a peaceful pond surrounded by tall grass and
            colorful flowers, there lived a young turtle named Tommy. Tommy was curious
            about the world beyond his pond. Every day, he would swim to the edge and
            peek through the reeds, wondering what adventures awaited him.""",
        },
    ]

    # Get bucket name from environment or use default
    import os

    bucket_name = os.getenv("AUDIO_CACHE_BUCKET", "readerai-audio-cache-dev")

    print("🎤 Testing AWS Polly Integration")
    print(f"📦 Using bucket: {bucket_name}")
    print("=" * 50)

    tester = PollyTester(bucket_name)

    for sample in test_samples:
        print(f"\n📝 Testing: {sample['name']}")
        print(f"   Text length: {len(sample['text'])} characters")

        # First request (should generate)
        result1 = tester.synthesize_speech(sample["text"])

        # Second request (should be cached)
        print("   Testing cache...")
        result2 = tester.synthesize_speech(sample["text"])

        assert result2["cached"] is True, "Second request should be cached"
        assert result1["cache_key"] == result2["cache_key"], "Cache keys should match"

        print("   ✅ Cache working correctly!")

    print("\n" + "=" * 50)
    print("✅ All tests passed!")
    print("\nYou can now access the audio files at:")
    print(f"   https://{bucket_name}.s3.amazonaws.com/polly/Joanna/[cache_key].mp3")


if __name__ == "__main__":
    main()
