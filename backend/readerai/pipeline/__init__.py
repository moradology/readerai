"""
Chapter extraction pipeline.

This module provides tools for extracting chapters from books using
targeted boundary detection with LLM verification.
"""

from readerai.pipeline.chapter_boundary_detector import (
    ChapterBoundaryPair,
    ChapterDetector,
    ChapterExtractionResult,
    extract_chapters,
)

__all__ = [
    "ChapterBoundaryPair",
    "ChapterExtractionResult",
    "ChapterDetector",
    "extract_chapters",
]
