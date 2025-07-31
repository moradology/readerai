"""
LLM (Language Model) configuration with provider registry
"""

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class LLMProvider(BaseModel):
    """Configuration for a single LLM provider"""

    # Provider name for internal reference
    name: str = Field(
        description="Provider identifier (e.g., openai, anthropic, local)"
    )

    # OpenAI-compatible endpoint
    api_base: str = Field(description="Base URL for OpenAI-compatible API")

    # Available models on this provider
    models: list[str] = Field(
        default_factory=list,
        description="List of available model IDs on this provider",
    )

    # API key for authentication
    api_key: str | None = Field(
        default=None,
        description="API key for this provider (can also be set via env var)",
    )

    # Optional provider-specific settings
    timeout: int = Field(default=30, description="Request timeout in seconds")
    max_retries: int = Field(default=3, description="Maximum retry attempts")


class LLMSettings(BaseSettings):
    """LLM configuration with provider registry and role assignments"""

    # Registry of available providers
    providers: dict[str, LLMProvider] = Field(
        default_factory=lambda: {
            "openai": LLMProvider(
                name="openai",
                api_base="https://api.openai.com/v1",
                models=["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
            ),
            "anthropic": LLMProvider(
                name="anthropic",
                api_base="https://api.anthropic.com/v1",
                models=["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
            ),
        },
        description="Registry of configured LLM providers",
    )

    # Model assignments for different roles in the application
    # Format: "provider:model" - provider is always required
    models: dict[str, str] = Field(
        default_factory=lambda: {
            "comprehension": "openai:gpt-4",  # For generating comprehension questions
            "vocabulary": "openai:gpt-3.5-turbo",  # For vocabulary explanations
            "assessment": "openai:gpt-4",  # For evaluating student answers
        },
        description="Model assignments for different application roles (provider:model format required)",
    )

    model_config = SettingsConfigDict(env_prefix="LLM_")

    def get_provider_for_role(self, role: str) -> tuple[LLMProvider, str]:
        """
        Get the provider and model for a specific role.

        Args:
            role: The application role (e.g., "comprehension", "vocabulary")

        Returns:
            Tuple of (provider config, model name)

        Raises:
            ValueError: If role or provider not found, or if format is invalid
        """
        if role not in self.models:
            raise ValueError(
                f"Unknown role: {role}. Available roles: {list(self.models.keys())}"
            )

        model_ref = self.models[role]

        # Parse provider:model format (required)
        if ":" not in model_ref:
            raise ValueError(
                f"Invalid model reference '{model_ref}' for role '{role}'. "
                f"Format must be 'provider:model' (e.g., 'openai:gpt-4')"
            )

        provider_name, model_name = model_ref.split(":", 1)

        if provider_name not in self.providers:
            raise ValueError(
                f"Unknown provider: {provider_name}. Available: {list(self.providers.keys())}"
            )

        provider = self.providers[provider_name]

        # Validate model is available on this provider
        if provider.models and model_name not in provider.models:
            raise ValueError(
                f"Model {model_name} not available on {provider_name}. "
                f"Available models: {provider.models}"
            )

        return provider, model_name

    def get_provider(self, provider_model: str) -> tuple[LLMProvider, str]:
        """
        Get provider and model from a "provider:model" string.

        This is a convenience method for when you want to use an arbitrary
        model reference without going through the role system.

        Args:
            provider_model: String in format "provider:model"

        Returns:
            Tuple of (provider config, model name)

        Raises:
            ValueError: If format is invalid or provider not found
        """
        if ":" not in provider_model:
            raise ValueError(
                f"Invalid model reference '{provider_model}'. "
                f"Format must be 'provider:model' (e.g., 'openai:gpt-4')"
            )

        provider_name, model_name = provider_model.split(":", 1)

        if provider_name not in self.providers:
            raise ValueError(
                f"Unknown provider: {provider_name}. Available: {list(self.providers.keys())}"
            )

        provider = self.providers[provider_name]

        # Validate model is available on this provider
        if provider.models and model_name not in provider.models:
            raise ValueError(
                f"Model {model_name} not available on {provider_name}. "
                f"Available models: {provider.models}"
            )

        return provider, model_name
