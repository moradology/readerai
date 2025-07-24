"""
Async TTS service using AWS Polly with S3 caching.

Key features:
• SHA-256 cache keys (text + voice) – avoids unnecessary syntheses.
• Stores audio.mp3, text.json and timings.json in S3.
• Generates pre-signed URLs for HTTP streaming.
• Extracts word-level timings via Polly speech marks.
• Supports single and batch operations.
"""

from __future__ import annotations

import hashlib
import json
import logging

import aioboto3
import anyio
from botocore.exceptions import ClientError

from readerai.config import Settings, get_settings

from .models import (
    TTSBatchRequest,
    TTSBatchResponse,
    TTSRequest,
    TTSResponse,
    WordTiming,
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class TTSService:
    """
    High-level interface around AWS Polly for generating and caching speech.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._session: aioboto3.Session | None = None

    # --------------------------------------------------------------------- #
    # Internal helpers
    # --------------------------------------------------------------------- #

    @property
    def session(self) -> aioboto3.Session:
        """
        Lazily construct an aioboto3.Session, taking AWS profile / region
        information from the config.
        """
        if self._session is None:
            if self.settings.aws.profile:
                self._session = aioboto3.Session(
                    profile_name=self.settings.aws.profile,
                    region_name=self.settings.aws.region,
                )
            else:
                self._session = aioboto3.Session(region_name=self.settings.aws.region)
        return self._session

    @staticmethod
    def _generate_cache_key(text: str, voice_id: str, engine: str = "standard") -> str:
        """
        Deterministic cache key for a unique (text, voice, engine) tuple.
        """
        return hashlib.sha256(f"{text}:{voice_id}:{engine}".encode()).hexdigest()

    def _build_s3_keys(
        self, voice_id: str, cache_key: str, engine: str = "standard"
    ) -> tuple[str, str, str]:
        """
        Construct S3 keys (audio, text, timings) for a synthesis result.
        """
        base_prefix = f"polly/{engine}/{voice_id}/{cache_key}"
        return (
            f"{base_prefix}/audio.mp3",
            f"{base_prefix}/text.json",
            f"{base_prefix}/timings.json",
        )

    async def _object_exists(self, s3_client, bucket: str, key: str) -> bool:  # type: ignore[valid-type]
        """
        Async wrapper around S3 head_object.
        """
        try:
            await s3_client.head_object(Bucket=bucket, Key=key)
            return True
        except ClientError as exc:  # noqa: BLE001
            if exc.response["Error"]["Code"] in {"404", "NotFound"}:
                return False
            raise  # Unexpected error

    async def _presign(
        self,
        s3_client,
        bucket: str,
        key: str,
        expires: int = 3600,  # type: ignore[valid-type]
    ) -> str:
        """
        Generate a presigned URL for GET access.
        """
        return await s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=expires,
        )

    # --------------------------------------------------------------------- #
    # Public API
    # --------------------------------------------------------------------- #

    async def synthesize(
        self, request: TTSRequest, presign_expires: int = 3600
    ) -> TTSResponse:
        """
        Synthesize or fetch a single piece of text.
        """
        voice_id = request.voice_id or "Joanna"  # Default voice
        engine = request.engine or "standard"  # Default to standard for on-the-fly
        cache_key = self._generate_cache_key(request.text, voice_id, engine)
        audio_key, text_key, timings_key = self._build_s3_keys(
            voice_id, cache_key, engine
        )
        bucket = self.settings.aws.audio_cache_bucket

        async with self.session.client("s3") as s3:  # type: ignore
            exists = await self._object_exists(s3, bucket, audio_key)

        if exists:
            logger.debug("Cache hit for key: %s", cache_key)
            async with self.session.client("s3") as s3:  # type: ignore
                cached_presigned_audio = await self._presign(
                    s3, bucket, audio_key, presign_expires
                )
                cached_presigned_text = await self._presign(
                    s3, bucket, text_key, presign_expires
                )
                cached_presigned_timings = await self._presign(
                    s3, bucket, timings_key, presign_expires
                )

            return TTSResponse(
                cached=True,
                cache_key=cache_key,
                audio_key=audio_key,
                text_key=text_key,
                timings_key=timings_key,
                presigned_audio_url=cached_presigned_audio,
                presigned_text_url=cached_presigned_text,
                presigned_timings_url=cached_presigned_timings,
                timings=None,
            )

        # Cache miss – perform synthesis
        engine = request.engine or "standard"  # Default to standard for on-the-fly
        logger.info(
            "Cache miss, synthesising with Polly (voice=%s, engine=%s).",
            voice_id,
            engine,
        )
        audio_bytes, timing_objs = await self._synthesize_with_polly(
            text=request.text, voice_id=voice_id, engine=engine
        )

        # Upload objects
        async with self.session.client("s3") as s3:  # type: ignore
            async with anyio.create_task_group() as tg:
                tg.start_soon(
                    s3.put_object,
                    Bucket=bucket,
                    Key=audio_key,
                    Body=audio_bytes,
                    ContentType="audio/mpeg",
                    StorageClass="ONEZONE_IA",
                )
                tg.start_soon(
                    s3.put_object,
                    Bucket=bucket,
                    Key=text_key,
                    Body=json.dumps({"text": request.text}, indent=2),
                    ContentType="application/json",
                )
                tg.start_soon(
                    s3.put_object,
                    Bucket=bucket,
                    Key=timings_key,
                    Body=json.dumps([t.model_dump() for t in timing_objs], indent=2),
                    ContentType="application/json",
                )

            # Get presigned URLs
            presigned_audio: str = ""
            presigned_text: str = ""
            presigned_timings: str = ""

            async with anyio.create_task_group() as tg:

                async def get_audio():
                    nonlocal presigned_audio
                    presigned_audio = await self._presign(s3, bucket, audio_key)

                async def get_text():
                    nonlocal presigned_text
                    presigned_text = await self._presign(s3, bucket, text_key)

                async def get_timings():
                    nonlocal presigned_timings
                    presigned_timings = await self._presign(s3, bucket, timings_key)

                tg.start_soon(get_audio)
                tg.start_soon(get_text)
                tg.start_soon(get_timings)

        logger.info("Uploaded synthesised speech to s3://%s/%s", bucket, audio_key)

        return TTSResponse(
            cached=False,
            cache_key=cache_key,
            audio_key=audio_key,
            text_key=text_key,
            timings_key=timings_key,
            presigned_audio_url=presigned_audio,
            presigned_text_url=presigned_text,
            presigned_timings_url=presigned_timings,
            timings=timing_objs,
        )

    async def synthesize_batch(
        self, batch_request: TTSBatchRequest, presign_expires: int = 3600
    ) -> TTSBatchResponse:
        """
        Process a batch of syntheses concurrently.
        """
        results: list[TTSResponse] = []

        async with anyio.create_task_group() as tg:
            # Create a list to store results in order
            temp_results: list[tuple[int, TTSResponse]] = []

            async def process_item(idx: int, req: TTSRequest):
                result = await self.synthesize(req, presign_expires=presign_expires)
                temp_results.append((idx, result))

            for idx, req in enumerate(batch_request.items):
                tg.start_soon(process_item, idx, req)

        # Sort results by index and extract just the responses
        temp_results.sort(key=lambda x: x[0])
        results = [result for _, result in temp_results]

        return TTSBatchResponse(results=results)

    # --------------------------------------------------------------------- #
    # Polly interaction
    # --------------------------------------------------------------------- #

    async def _synthesize_with_polly(
        self, *, text: str, voice_id: str, engine: str = "standard"
    ) -> tuple[bytes, list[WordTiming]]:
        """
        Fetch audio bytes and word timings from Polly.

        Note: Polly requires two separate requests for audio vs speech marks.
        """
        async with self.session.client("polly") as polly:  # type: ignore
            # 1. Audio (MP3)
            audio_resp = await polly.synthesize_speech(
                Text=text,
                VoiceId=voice_id,
                OutputFormat="mp3",
                Engine=engine,
            )
            audio_stream = audio_resp["AudioStream"]
            audio_bytes: bytes = await audio_stream.read()

            # 2. Speech marks (word timings)
            timing_resp = await polly.synthesize_speech(
                Text=text,
                VoiceId=voice_id,
                OutputFormat="json",
                SpeechMarkTypes=["word"],
                Engine=engine,
            )
            timing_stream = timing_resp["AudioStream"]
            timing_json_bytes: bytes = await timing_stream.read()

            timing_objs = self._parse_speech_marks(timing_json_bytes.decode("utf-8"))

        return audio_bytes, timing_objs

    @staticmethod
    def _parse_speech_marks(payload: str) -> list[WordTiming]:
        """
        Convert the line-delimited JSON returned by Polly into `WordTiming` objects.
        """
        timings: list[WordTiming] = []
        for line in payload.splitlines():
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                if data.get("type") == "word":
                    timings.append(WordTiming(**data))
            except json.JSONDecodeError:
                # Skip malformed lines
                continue
        return timings


__all__ = ["TTSService"]
