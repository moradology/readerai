"""
LLM client utilities using the provider registry
"""

from .client import (
    get_assessment_lm,
    get_comprehension_lm,
    get_llm,
    get_llm_client,
    get_vocabulary_lm,
)

__all__ = [
    "get_llm_client",
    "get_llm",
    "get_comprehension_lm",
    "get_vocabulary_lm",
    "get_assessment_lm",
]
