"""
Example showing how to use the LLM provider registry pattern.

This demonstrates:
1. How providers are configured in settings.yaml
2. How to get the right LLM for different roles
3. How to swap providers without changing code
"""

from readerai.config import get_settings
from readerai.llm import get_comprehension_lm, get_llm, get_vocabulary_lm


def example_usage():
    """Show how to use different LLMs for different tasks"""

    # Get settings to see configuration
    settings = get_settings()

    print("Configured LLM Providers:")
    for name, provider in settings.llm.providers.items():
        print(f"  {name}: {provider.api_base}")

    print("\nModel Assignments:")
    for role, model in settings.llm.models.items():
        print(f"  {role}: {model}")

    # Get LLM clients for different roles
    # These automatically use the right provider and model
    comprehension_lm = get_comprehension_lm()
    vocabulary_lm = get_vocabulary_lm()

    print("\nLLM clients created successfully!")
    print(f"Comprehension LLM: {comprehension_lm}")
    print(f"Vocabulary LLM: {vocabulary_lm}")

    # Use arbitrary models directly
    print("\nUsing arbitrary models:")
    groq_llm = get_llm("groq:qwen/qwen3-32b")
    print(f"Groq LLM: {groq_llm}")

    anthropic_llm = get_llm("anthropic:claude-3-haiku")
    print(f"Anthropic LLM: {anthropic_llm}")


def example_settings_yaml():
    """
    Example settings.yaml configuration:

    ```yaml
    llm:
      providers:
        # Production: Use GPT-4 for quality
        openai:
          name: openai
          api_base: https://api.openai.com/v1
          models: [gpt-4, gpt-4-turbo, gpt-3.5-turbo]

        # Development: Use local LLM to save costs
        local:
          name: local
          api_base: http://localhost:8080/v1
          models: [llama-70b]

        # Alternative: Use Anthropic for specific tasks
        anthropic:
          name: anthropic
          api_base: https://api.anthropic.com/v1
          models: [claude-3-opus, claude-3-haiku]

      # Model assignments - provider is always required (no default)
      models:
        comprehension: openai:gpt-4        # High quality for questions
        vocabulary: local:llama-70b        # Local model to save costs
        assessment: anthropic:claude-3-opus # Best reasoning for assessment

      # Note: You can also use models directly without roles:
      # from readerai.llm import get_llm
      # llm = get_llm("groq:mixtral-8x7b")
    ```
    """
    pass


if __name__ == "__main__":
    example_usage()
