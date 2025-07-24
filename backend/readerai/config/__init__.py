"""
Application configuration using pydantic-settings

Minimal configuration - only what truly needs to be configured.
Everything else should be a parameter.
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from .audio import AudioSettings
from .aws import AWSSettings
from .database import DatabaseSettings
from .llm import LLMSettings
from .server import ServerSettings
from .types import Environment

__all__ = [
    "Settings",
    "get_settings",
    "reload_settings",
    "Environment",
    "AWSSettings",
    "ServerSettings",
    "LLMSettings",
    "AudioSettings",
    "DatabaseSettings",
]


class Settings(BaseSettings):
    """Main settings aggregator - minimal configuration"""

    # Sub-settings
    aws: AWSSettings = Field(default_factory=AWSSettings)
    server: ServerSettings = Field(default_factory=ServerSettings)
    llm: LLMSettings = Field(default_factory=LLMSettings)
    audio: AudioSettings = Field(default_factory=AudioSettings)
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)

    # Root settings
    app_name: str = Field(default="ReaderAI", description="Application name")
    version: str = Field(default="0.1.0", description="Application version")

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )


_settings: Settings | None = None


def get_settings() -> Settings:
    """Get or create settings instance"""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def reload_settings() -> Settings:
    """Force reload settings (useful for testing)"""
    global _settings
    _settings = Settings()
    return _settings
