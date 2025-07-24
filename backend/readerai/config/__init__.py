"""
Application configuration using pydantic-settings

Minimal configuration - only what truly needs to be configured.
Everything else should be a parameter.
"""

from pathlib import Path
from typing import Any

import yaml
from pydantic import Field
from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
)

from .aws import AWSSettings
from .database import DatabaseSettings
from .llm import LLMSettings
from .server import ServerSettings

__all__ = [
    "Settings",
    "get_settings",
    "reload_settings",
    "AWSSettings",
    "ServerSettings",
    "DatabaseSettings",
    "LLMSettings",
]


class YamlSettingsSource(PydanticBaseSettingsSource):
    """
    Settings source that loads from YAML files
    """

    def __init__(
        self, settings_cls: type[BaseSettings], yaml_file: Path | str | None = None
    ):
        super().__init__(settings_cls)
        if yaml_file:
            self.yaml_file = Path(yaml_file)
        else:
            self.yaml_file = Path("settings.yaml")
        self._data: dict[str, Any] | None = None

    def _read_file(self, file_path: Path) -> dict[str, Any] | None:
        if not file_path.exists():
            return None
        try:
            with open(file_path) as f:
                return yaml.safe_load(f)
        except Exception:
            return None

    def get_field_value(
        self, field: Any, field_name: str
    ) -> tuple[Any, str, bool]:
        """Get field value from YAML data"""
        if self._data is None:
            self._data = self._read_file(self.yaml_file) or {}

        # Check if field exists in YAML data
        if field_name in self._data:
            return self._data[field_name], field_name, False

        # Not found
        return None, field_name, False

    def __call__(self) -> dict[str, Any]:
        if self._data is None:
            self._data = self._read_file(self.yaml_file) or {}
        return self._data

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(yaml_file={self.yaml_file!r})"


class Settings(BaseSettings):
    """Main settings aggregator - minimal configuration"""

    # Sub-settings
    aws: AWSSettings = Field(default_factory=AWSSettings)
    server: ServerSettings = Field(default_factory=ServerSettings)
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    llm: LLMSettings = Field(default_factory=LLMSettings)

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        """
        Customize settings sources to add YAML support.

        Priority order (later overrides earlier):
        1. Default values in code
        2. settings.yaml file
        3. Environment variables
        4. .env file
        5. Init kwargs
        """
        return (
            init_settings,
            YamlSettingsSource(settings_cls),
            env_settings,
            dotenv_settings,
            file_secret_settings,
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
