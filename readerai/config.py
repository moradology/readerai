"""
Application configuration using pydantic-settings
"""

from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AWSSettings(BaseSettings):
    """AWS-related configuration"""

    region: str = Field(default="us-east-1", description="AWS region")
    audio_cache_bucket: str = Field(
        default="readerai-audio-cache-dev", description="S3 bucket for audio cache"
    )

    # Polly settings
    polly_voice_id: str = Field(default="Joanna", description="Default Polly voice")
    polly_engine: str = Field(default="standard", description="Polly engine type")

    # AWS credentials options
    profile: Optional[str] = Field(default=None, description="AWS profile name")
    aws_access_key_id: Optional[str] = Field(default=None, description="AWS access key")
    aws_secret_access_key: Optional[str] = Field(default=None, description="AWS secret")

    model_config = SettingsConfigDict(env_prefix="AWS_")


class ServerSettings(BaseSettings):
    """Server configuration"""

    host: str = Field(default="0.0.0.0", description="Server host")  # nosec B104
    port: int = Field(default=8000, description="Server port")
    environment: str = Field(default="development", description="Environment name")
    debug: bool = Field(default=True, description="Debug mode")

    # CORS settings
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description="Allowed CORS origins",
    )

    model_config = SettingsConfigDict(env_prefix="SERVER_")


class LLMSettings(BaseSettings):
    """LLM configuration"""

    provider: str = Field(default="openai", description="LLM provider")
    model: str = Field(default="gpt-4", description="Model name")
    api_key: Optional[str] = Field(default=None, description="API key")
    temperature: float = Field(default=0.7, description="Temperature")
    max_tokens: int = Field(default=1000, description="Max tokens")

    model_config = SettingsConfigDict(env_prefix="LLM_")


class AudioSettings(BaseSettings):
    """Audio processing configuration"""

    chunk_target_words: int = Field(
        default=400, description="Target words per audio chunk"
    )
    chunk_min_words: int = Field(default=200, description="Minimum words per chunk")
    chunk_max_words: int = Field(default=800, description="Maximum words per chunk")

    # Audio file settings
    audio_format: str = Field(default="mp3", description="Audio output format")
    audio_sample_rate: int = Field(default=22050, description="Sample rate")

    model_config = SettingsConfigDict(env_prefix="AUDIO_")


class DatabaseSettings(BaseSettings):
    """Database configuration"""

    url: str = Field(default="sqlite:///./readerai.db", description="Database URL")
    echo: bool = Field(default=False, description="Echo SQL queries")

    model_config = SettingsConfigDict(env_prefix="DB_")


class Settings(BaseSettings):
    """Main settings aggregator"""

    # Sub-settings
    aws: AWSSettings = Field(default_factory=AWSSettings)
    server: ServerSettings = Field(default_factory=ServerSettings)
    llm: LLMSettings = Field(default_factory=LLMSettings)
    audio: AudioSettings = Field(default_factory=AudioSettings)
    db: DatabaseSettings = Field(default_factory=DatabaseSettings)

    # Root settings
    app_name: str = Field(default="ReaderAI", description="Application name")
    version: str = Field(default="0.1.0", description="Application version")

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )


# Singleton instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get or create settings instance"""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


# Convenience function for CLI tools
def reload_settings() -> Settings:
    """Force reload settings (useful for testing)"""
    global _settings
    _settings = Settings()
    return _settings
