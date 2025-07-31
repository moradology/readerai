"""
Database configuration
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseSettings(BaseSettings):
    """Database configuration"""

    url: str = Field(
        default="sqlite:///./readerai.db",
        description="Database URL (can include pool params: postgresql://...?pool_size=20)",
    )

    # Redis configuration (for future caching/session management)
    redis_url: str | None = Field(
        default=None,
        description="Redis URL for caching (optional)",
    )

    model_config = SettingsConfigDict(env_prefix="DATABASE_")
