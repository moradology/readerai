"""
Audio-related configuration
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AudioSettings(BaseSettings):
    """Audio processing configuration"""

    default_voice: str = Field(default="Joanna", description="Default AWS Polly voice")
    default_engine: str = Field(
        default="neural", description="Default TTS engine (neural/standard)"
    )
    default_sample_rate: int = Field(
        default=24000, description="Default audio sample rate"
    )
    default_format: str = Field(default="mp3", description="Default audio format")

    # Chunking settings
    default_chunk_words: int = Field(
        default=400, description="Default words per chunk for stories"
    )
    min_chunk_words: int = Field(default=100, description="Minimum words per chunk")
    max_chunk_words: int = Field(default=1000, description="Maximum words per chunk")

    model_config = SettingsConfigDict(env_prefix="AUDIO_")
