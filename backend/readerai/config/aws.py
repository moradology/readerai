"""
AWS-related configuration
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AWSSettings(BaseSettings):
    """AWS configuration - only what's environment-specific"""

    region: str = Field(default="us-east-1", description="AWS region")
    audio_cache_bucket: str = Field(
        default="readerai-audio-cache-dev", description="S3 bucket for audio cache"
    )
    # AWS credentials - rely on standard AWS credential chain
    profile: str | None = Field(default=None, description="AWS profile name (optional)")

    model_config = SettingsConfigDict(env_prefix="AWS_")
