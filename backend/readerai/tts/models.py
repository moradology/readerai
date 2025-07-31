"""
Pydantic models for the TTS service.
"""

from pydantic import BaseModel, Field


class WordTiming(BaseModel):
    """
    Word-level timing information extracted from Polly speech marks.
    """

    value: str = Field(..., description="The spoken word")
    time: int = Field(..., description="Start time in milliseconds")
    start: int = Field(..., description="Byte position where the word begins")
    end: int = Field(..., description="Byte position where the word ends")
    type: str = Field(..., description="Should be 'word'")


class TTSRequest(BaseModel):
    """
    Request model for synthesising a single text string.
    """

    text: str = Field(..., description="Plain-text input to be spoken")
    voice_id: str | None = Field(None, description="AWS Polly voice ID to use")
    engine: str | None = Field(None, description="Polly engine: 'standard' or 'neural'")


class TTSBatchRequest(BaseModel):
    """
    Request model for synthesising multiple pieces of text.
    """

    items: list[TTSRequest] = Field(..., description="List of TTS requests")


class TTSResponse(BaseModel):
    """
    Response for a single synthesis request.
    """

    cached: bool = Field(..., description="Whether the audio was already cached")
    cache_key: str = Field(..., description="SHA-256 of text + voice used as cache key")
    audio_key: str = Field(..., description="S3 key where audio was stored")
    text_key: str = Field(..., description="S3 key where original text JSON stored")
    timings_key: str = Field(..., description="S3 key where timings JSON stored")

    presigned_audio_url: str = Field(..., description="HTTP URL for streaming audio")
    presigned_text_url: str = Field(
        ..., description="HTTP URL for retrieving text JSON"
    )
    presigned_timings_url: str = Field(
        ..., description="HTTP URL for retrieving timings JSON"
    )

    timings: list[WordTiming] | None = Field(
        None,
        description=(
            "Parsed timing objects. Included only when newly generated; "
            "omit for cached items to keep payload small."
        ),
    )


class TTSBatchResponse(BaseModel):
    """
    Response containing multiple synthesis results.
    """

    results: list[TTSResponse]


__all__ = [
    "WordTiming",
    "TTSRequest",
    "TTSBatchRequest",
    "TTSResponse",
    "TTSBatchResponse",
]
