"""
TTS API router.

All business logic lives in readerai.tts.service.TTSService –
these endpoints only handle request/response translation
and HTTP-specific concerns.
"""

from __future__ import annotations

import json
import logging
from functools import lru_cache

import anyio
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from pydantic import BaseModel

from readerai.config import Settings, get_settings
from readerai.tts.models import (
    TTSBatchRequest,
    TTSBatchResponse,
    TTSRequest,
    TTSResponse,
    WordTiming,
)
from readerai.tts.service import TTSService

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Response models for new cache-retrieval endpoints
# --------------------------------------------------------------------------- #


class PresignedAudioResponse(BaseModel):
    """Response model containing a single presigned audio URL."""

    presigned_audio_url: str


class CachedTextResponse(BaseModel):
    """Response model containing the original text that was synthesised."""

    text: str


class PresignedAllResponse(BaseModel):
    """Response model containing all three presigned URLs for a cache key."""

    presigned_audio_url: str
    presigned_text_url: str
    presigned_timings_url: str


# --------------------------------------------------------------------------- #
# Dependency injection – functional style
# --------------------------------------------------------------------------- #


@lru_cache
def _get_service(settings: Settings | None = None) -> TTSService:
    """
    Lazily-constructed, cached TTSService instance.

    Using lru_cache ensures that the same object is reused across requests
    without us having to manage global state manually.
    """
    return TTSService(settings=settings or get_settings())


# Alias for FastAPI Depends usage
def get_tts_service() -> TTSService:  # pragma: no cover
    return _get_service()


# --------------------------------------------------------------------------- #
# Router definition
# --------------------------------------------------------------------------- #

router = APIRouter(
    prefix="/api/tts",
    tags=["Text-to-Speech"],
    responses={
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "description": "Unexpected server error.",
        },
    },
)


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #


@router.post(
    "/synthesize",
    response_model=TTSResponse,
    status_code=status.HTTP_200_OK,
    summary="Synthesize a single text snippet",
    response_description="Information about the generated or cached audio, "
    "including presigned URLs.",
)
async def synthesize_endpoint(
    request: TTSRequest,
    tts: TTSService = Depends(get_tts_service),
) -> TTSResponse:
    """
    Convert a piece of text to speech (or retrieve it from cache).

    Returns presigned URLs for the audio, original text JSON, and timings JSON.
    """
    try:
        return await tts.synthesize(request)
    except (BotoCoreError, ClientError) as exc:
        logger.exception("AWS error during TTS synthesis: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upstream AWS Polly / S3 error.",
        ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unhandled error during TTS synthesis: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error.",
        ) from exc


@router.post(
    "/synthesize-batch",
    response_model=TTSBatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Synthesize multiple text snippets concurrently",
    response_description="Batch of synthesis results, each with presigned URLs.",
)
async def synthesize_batch_endpoint(
    batch: TTSBatchRequest,
    tts: TTSService = Depends(get_tts_service),
) -> TTSBatchResponse:
    """
    Perform multiple syntheses concurrently and return their results as a batch.
    """
    try:
        return await tts.synthesize_batch(batch)
    except (BotoCoreError, ClientError) as exc:
        logger.exception("AWS error during batch synthesis: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upstream AWS Polly / S3 error.",
        ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unhandled error during batch synthesis: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error.",
        ) from exc


@router.get(
    "/{cache_key}/timings",
    response_model=list[WordTiming],
    summary="Retrieve word-level timings for a cached synthesis",
    response_description="List of WordTiming objects extracted from Polly.",
)
async def get_timings_endpoint(
    cache_key: str,
    voice_id: str | None = Query(
        default=None,
        description=(
            "Polly voice ID used for synthesis. "
            "If omitted, the default voice in configuration is assumed."
        ),
    ),
    engine: str = Query(
        default="standard",
        description="Polly engine used: 'standard' or 'neural'.",
    ),
    tts: TTSService = Depends(get_tts_service),
) -> list[WordTiming]:
    """
    Fetch previously stored timings.json from S3 for the given cache key.

    This does **not** trigger a re-synthesis; it only retrieves cached data.
    """
    voice_id = voice_id or "Joanna"  # Default voice
    bucket = tts.settings.aws.audio_cache_bucket

    # We leverage the service's private helper to keep S3-key convention consistent.
    _, _, timings_key = tts._build_s3_keys(
        voice_id=voice_id, cache_key=cache_key, engine=engine
    )

    try:
        async with tts.session.client("s3") as s3:  # type: ignore
            obj = await s3.get_object(Bucket=bucket, Key=timings_key)
            raw_bytes: bytes = await obj["Body"].read()
    except ClientError as exc:
        if exc.response["Error"]["Code"] in {"NoSuchKey", "404", "NotFound"}:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Timing data not found for the provided cache key.",
            ) from exc
        logger.exception("AWS S3 error while fetching timings: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upstream AWS S3 error.",
        ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unhandled error while fetching timings: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error.",
        ) from exc

    try:
        payload = json.loads(raw_bytes.decode("utf-8"))
        return [WordTiming(**t) for t in payload]
    except (json.JSONDecodeError, TypeError) as exc:
        logger.warning("Malformed timings JSON for cache_key=%s", cache_key)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Corrupted timings data.",
        ) from exc


@router.get(
    "/{cache_key}/audio",
    response_model=PresignedAudioResponse,
    summary="Get presigned URL for cached audio",
    response_description="Presigned S3 URL for the MP3 file.",
)
async def get_audio_endpoint(
    cache_key: str,
    voice_id: str | None = Query(
        default=None,
        description="Polly voice ID used for synthesis. Defaults to the configured voice.",
    ),
    engine: str = Query(
        default="standard",
        description="Polly engine used: 'standard' or 'neural'.",
    ),
    expires: int = Query(
        default=3600, description="Expiry time (seconds) for the presigned URL."
    ),
    tts: TTSService = Depends(get_tts_service),
) -> PresignedAudioResponse:
    voice_id = voice_id or "Joanna"  # Default voice
    audio_key, _, _ = tts._build_s3_keys(
        voice_id=voice_id, cache_key=cache_key, engine=engine
    )
    bucket = tts.settings.aws.audio_cache_bucket

    try:
        async with tts.session.client("s3") as s3:  # type: ignore
            exists = await tts._object_exists(s3, bucket, audio_key)
            if not exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Cached audio not found for the provided cache key.",
                )
            url = await tts._presign(s3, bucket, audio_key, expires)
            return PresignedAudioResponse(presigned_audio_url=url)
    except ClientError as exc:
        logger.exception("AWS S3 error while presigning audio: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upstream AWS S3 error.",
        ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unhandled error while fetching audio presign: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error.",
        ) from exc


@router.get(
    "/{cache_key}/text",
    response_model=CachedTextResponse,
    summary="Get the original text from cache",
    response_description="Original text that was synthesised.",
)
async def get_text_endpoint(
    cache_key: str,
    voice_id: str | None = Query(
        default=None,
        description="Polly voice ID used for synthesis. Defaults to the configured voice.",
    ),
    engine: str = Query(
        default="standard",
        description="Polly engine used: 'standard' or 'neural'.",
    ),
    tts: TTSService = Depends(get_tts_service),
) -> CachedTextResponse:
    voice_id = voice_id or "Joanna"  # Default voice
    _, text_key, _ = tts._build_s3_keys(
        voice_id=voice_id, cache_key=cache_key, engine=engine
    )
    bucket = tts.settings.aws.audio_cache_bucket

    try:
        async with tts.session.client("s3") as s3:  # type: ignore
            obj = await s3.get_object(Bucket=bucket, Key=text_key)
            raw_bytes: bytes = await obj["Body"].read()
    except ClientError as exc:
        if exc.response["Error"]["Code"] in {"NoSuchKey", "404", "NotFound"}:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cached text not found for the provided cache key.",
            ) from exc
        logger.exception("AWS S3 error while fetching text: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upstream AWS S3 error.",
        ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unhandled error while fetching cached text: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error.",
        ) from exc

    try:
        payload = json.loads(raw_bytes.decode("utf-8"))
        text_value = payload.get("text") if isinstance(payload, dict) else None
        if not text_value:
            raise ValueError("Missing 'text' field in cached object.")
        return CachedTextResponse(text=text_value)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Malformed text JSON for cache_key=%s: %s", cache_key, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Corrupted text data.",
        ) from exc


@router.get(
    "/{cache_key}/all",
    response_model=PresignedAllResponse,
    summary="Get all presigned URLs for a cache key",
    response_description="Presigned URLs for audio, text and timings objects.",
)
async def get_all_presigned_endpoint(
    cache_key: str,
    voice_id: str | None = Query(
        default=None,
        description="Polly voice ID used for synthesis. Defaults to the configured voice.",
    ),
    engine: str = Query(
        default="standard",
        description="Polly engine used: 'standard' or 'neural'.",
    ),
    expires: int = Query(
        default=3600, description="Expiry time (seconds) for the presigned URLs."
    ),
    tts: TTSService = Depends(get_tts_service),
) -> PresignedAllResponse:
    voice_id = voice_id or "Joanna"  # Default voice
    audio_key, text_key, timings_key = tts._build_s3_keys(
        voice_id=voice_id, cache_key=cache_key, engine=engine
    )
    bucket = tts.settings.aws.audio_cache_bucket

    try:
        async with tts.session.client("s3") as s3:  # type: ignore
            # Ensure the primary artefact (audio) exists; if not, treat as cache miss.
            exists = await tts._object_exists(s3, bucket, audio_key)
            if not exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Cached objects not found for the provided cache key.",
                )
            async with anyio.create_task_group() as tg:
                presigned_audio: str = ""
                presigned_text: str = ""
                presigned_timings: str = ""

                async def get_audio():
                    nonlocal presigned_audio
                    presigned_audio = await tts._presign(s3, bucket, audio_key, expires)

                async def get_text():
                    nonlocal presigned_text
                    presigned_text = await tts._presign(s3, bucket, text_key, expires)

                async def get_timings():
                    nonlocal presigned_timings
                    presigned_timings = await tts._presign(
                        s3, bucket, timings_key, expires
                    )

                tg.start_soon(get_audio)
                tg.start_soon(get_text)
                tg.start_soon(get_timings)
            return PresignedAllResponse(
                presigned_audio_url=presigned_audio,
                presigned_text_url=presigned_text,
                presigned_timings_url=presigned_timings,
            )
    except ClientError as exc:
        logger.exception("AWS S3 error while presigning all URLs: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upstream AWS S3 error.",
        ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unhandled error while fetching all presigns: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error.",
        ) from exc
