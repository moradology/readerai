"""
LLM (Language Model) configuration
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class LLMSettings(BaseSettings):
    """LLM configuration - only API key which is environment-specific"""

    api_key: str | None = Field(
        default=None,
        description="API key (falls back to provider-specific env vars like OPENAI_API_KEY)",
    )

    model_config = SettingsConfigDict(env_prefix="LLM_")
