"""
Application configuration using pydantic-settings

Minimal configuration - only what truly needs to be configured.
Everything else should be a parameter.
"""

from enum import Enum

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(str, Enum):
    """Application environments"""

    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class AWSSettings(BaseSettings):
    """AWS configuration - only what's environment-specific"""

    region: str = Field(default="us-east-1", description="AWS region")
    audio_cache_bucket: str = Field(
        default="readerai-audio-cache-dev", description="S3 bucket for audio cache"
    )
    # AWS credentials - rely on standard AWS credential chain
    profile: str | None = Field(default=None, description="AWS profile name (optional)")

    model_config = SettingsConfigDict(env_prefix="AWS_")


class ServerSettings(BaseSettings):
    """Server configuration"""

    host: str = Field(
        default="0.0.0.0",  # nosec B104
        description="Server host",
    )
    port: int = Field(default=8000, description="Server port")
    environment: Environment = Field(
        default=Environment.DEVELOPMENT, description="Environment name"
    )
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description="Allowed CORS origins",
    )

    model_config = SettingsConfigDict(env_prefix="SERVER_")


class LLMSettings(BaseSettings):
    """LLM configuration - only API key which is environment-specific"""

    api_key: str | None = Field(
        default=None,
        description="API key (falls back to provider-specific env vars like OPENAI_API_KEY)",
    )

    model_config = SettingsConfigDict(env_prefix="LLM_")


class Settings(BaseSettings):
    """Main settings aggregator - minimal configuration"""

    # Sub-settings
    aws: AWSSettings = Field(default_factory=AWSSettings)
    server: ServerSettings = Field(default_factory=ServerSettings)
    llm: LLMSettings = Field(default_factory=LLMSettings)

    # Root settings
    app_name: str = Field(default="ReaderAI", description="Application name")
    version: str = Field(default="0.1.0", description="Application version")

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )


# Singleton instance
_settings: Settings | None = None


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
