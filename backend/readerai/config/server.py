"""
Server-related configuration
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class ServerSettings(BaseSettings):
    """Server configuration"""

    host: str = Field(
        default="0.0.0.0",  # nosec B104
        description="Server host",
    )
    port: int = Field(default=8000, description="Server port")

    model_config = SettingsConfigDict(env_prefix="SERVER_")
