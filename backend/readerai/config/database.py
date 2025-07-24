"""
Database configuration
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseSettings(BaseSettings):
    """Database configuration"""

    # SQLite by default for development
    url: str = Field(
        default="sqlite:///./readerai.db",
        description="Database URL",
    )
    echo: bool = Field(default=False, description="Echo SQL statements")
    pool_size: int = Field(default=10, description="Connection pool size")
    max_overflow: int = Field(default=20, description="Max overflow connections")

    # Redis configuration (for future caching/session management)
    redis_url: str | None = Field(
        default=None,
        description="Redis URL for caching (optional)",
    )

    model_config = SettingsConfigDict(env_prefix="DATABASE_")
