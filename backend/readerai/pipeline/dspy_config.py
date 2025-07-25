"""DSPy configuration for the chapter detector LLM.

This module ensures DSPy is properly configured for using LLMs in the pipeline.
"""

import os

import dspy


def configure_dspy_for_pipeline(model: str | None = None, api_key: str | None = None):
    """Configure DSPy for pipeline LLM usage.

    Args:
        model: Optional model override (e.g., "gemini/gemini-2.0-flash-001")
        api_key: Optional API key override
    """
    # Use provided model or default to Gemini Flash 2
    if model is None:
        model = os.getenv("DEFAULT_LLM_MODEL", "gemini/gemini-2.0-flash-001")

    # Get API key based on provider
    if api_key is None:
        if model.startswith("gemini/"):
            api_key = os.getenv("GOOGLE_API_KEY")
        elif model.startswith("openai/"):
            api_key = os.getenv("OPENAI_API_KEY")
        else:
            # Try to get a generic API key
            api_key = os.getenv("LLM_API_KEY")

    if not api_key:
        raise ValueError(
            f"No API key found for model {model}. Please set GOOGLE_API_KEY or OPENAI_API_KEY environment variable."
        )

    # Configure DSPy
    lm = dspy.LM(model, api_key=api_key)
    dspy.settings.configure(lm=lm)

    return lm
