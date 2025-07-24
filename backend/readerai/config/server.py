"""
Server-related configuration
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from .types import Environment


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
