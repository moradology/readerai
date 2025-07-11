"""
DSPy Configuration Utility
"""

import os
from typing import Optional

import dspy
from dotenv import load_dotenv


def configure_dspy(model_name: Optional[str] = None):
    """
    Configure DSPy with the specified model using the API key from environment variables.

    Args:
        model_name (Optional[str]): Optional model name override. Uses DEFAULT_LLM_MODEL from .env if not provided.
    """
    load_dotenv()
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found. Please set it in your .env file.")

    # Get model name from environment or use default
    model = model_name or os.getenv(
        "DEFAULT_LLM_MODEL", "gemini/gemini-2.5-flash-preview-04-17"
    )

    try:
        llm = dspy.LM(model, api_key=api_key)
        dspy.settings.configure(lm=llm)
        print(f"--- DSPy configured with model: {model} ---")
    except Exception as e:
        print(f"Error configuring DSPy with model {model}: {e}")
        print("Please check your model configuration and API key.")
        raise  # Re-raise the exception after printing info
