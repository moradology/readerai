"""
Example LLM client that uses the provider registry configuration
"""

import os

import dspy

from readerai.config import get_settings


def get_llm_client(role: str) -> dspy.LM:
    """
    Get a configured LLM client for a specific application role.

    Args:
        role: The application role (e.g., "comprehension", "vocabulary", "assessment")

    Returns:
        Configured dspy.LM instance

    Example:
        ```python
        # Get the LLM for generating comprehension questions
        comprehension_lm = get_llm_client("comprehension")

        # Get the LLM for vocabulary explanations
        vocab_lm = get_llm_client("vocabulary")
        ```
    """
    settings = get_settings()
    provider, model_name = settings.llm.get_provider_for_role(role)

    # Get API key from provider config or environment
    api_key = provider.api_key
    if not api_key:
        # Try common environment variable names
        env_var_names = {
            "openai": "OPENAI_API_KEY",
            "anthropic": "ANTHROPIC_API_KEY",
            "google": "GOOGLE_API_KEY",
            "azure": "AZURE_OPENAI_API_KEY",
        }
        env_var = env_var_names.get(provider.name, f"{provider.name.upper()}_API_KEY")
        api_key = os.getenv(env_var)

    if not api_key:
        raise ValueError(
            f"No API key found for provider '{provider.name}'. "
            f"Set it in config or via environment variable."
        )

    # Create dspy client with provider configuration
    return dspy.LM(
        model=f"{provider.name}/{model_name}",
        api_base=provider.api_base,
        api_key=api_key,
        timeout=provider.timeout,
        max_retries=provider.max_retries,
    )


# Convenience functions for common roles
def get_comprehension_lm() -> dspy.LM:
    """Get LLM configured for comprehension question generation"""
    return get_llm_client("comprehension")


def get_vocabulary_lm() -> dspy.LM:
    """Get LLM configured for vocabulary explanations"""
    return get_llm_client("vocabulary")


def get_assessment_lm() -> dspy.LM:
    """Get LLM configured for answer assessment"""
    return get_llm_client("assessment")


def get_llm(provider_model: str) -> dspy.LM:
    """
    Get an LLM client directly from a provider:model string.

    Args:
        provider_model: String in format "provider:model" (e.g., "openai:gpt-4")

    Returns:
        Configured dspy.LM instance

    Example:
        ```python
        # Get any model directly without going through roles
        llm = get_llm("anthropic:claude-3-haiku")
        llm = get_llm("groq:llama-3-70b")
        ```
    """
    settings = get_settings()
    provider, model_name = settings.llm.get_provider(provider_model)

    # Get API key from provider config or environment
    api_key = provider.api_key
    if not api_key:
        # Try common environment variable names
        env_var_names = {
            "openai": "OPENAI_API_KEY",
            "anthropic": "ANTHROPIC_API_KEY",
            "google": "GOOGLE_API_KEY",
            "azure": "AZURE_OPENAI_API_KEY",
            "groq": "GROQ_API_KEY",
        }
        env_var = env_var_names.get(provider.name, f"{provider.name.upper()}_API_KEY")
        api_key = os.getenv(env_var)

    if not api_key:
        raise ValueError(
            f"No API key found for provider '{provider.name}'. "
            f"Set it in config or via environment variable."
        )

    # Create dspy client with provider configuration
    return dspy.LM(
        model=f"{provider.name}/{model_name}",
        api_base=provider.api_base,
        api_key=api_key,
        timeout=provider.timeout,
        max_retries=provider.max_retries,
    )
