"""
Shared functionality for ReaderAI flows.

This module contains common imports and setup code used across all flow modules.
"""

# Remove os, dspy, load_dotenv imports if no longer needed here
# import os
# import dspy
# from dotenv import load_dotenv

# Import TEST_PASSAGE for testing, with fallback
try:
    from ..constants import TEST_PASSAGE
except ImportError:
    print(
        "Warning: Could not import TEST_PASSAGE from readerai.constants. Using default."
    )
    TEST_PASSAGE = "Default passage for testing functionality."


# Remove the configure_dspy function definition
# def configure_dspy():
#     """
#     Configure DSPy with the Gemini model using the API key from environment variables.
#     This function is called in each flow's __main__ block.
#     """
#     load_dotenv()
#     api_key = os.getenv("GOOGLE_API_KEY")
#     if not api_key:
#         raise ValueError("GOOGLE_API_KEY not found. Please set it in your .env file.")
#
#     model = "gemini/gemini-2.0-flash-001"
#     llm = dspy.LM(model, api_key=api_key)
#     dspy.settings.configure(lm=llm)
#     print("--- DSPy configured for direct script execution ---")
