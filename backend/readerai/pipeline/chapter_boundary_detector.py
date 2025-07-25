"""Chapter detection using specific start/end patterns.

This module implements the approach:
1. LLM identifies N chapters in the text
2. Generates unique start/end regex for each chapter
3. Validates exactly one match per pattern
4. LLM verifies the extracted content
"""

import re
from dataclasses import dataclass

import anyio
import dspy

from readerai.pipeline.dspy_config import configure_dspy_for_pipeline


@dataclass
class ChapterBoundaryPair:
    """A pair of regex patterns defining a specific chapter's boundaries."""

    chapter_number: int
    chapter_title: str
    start_pattern: str  # Regex to match chapter start
    end_pattern: str  # Regex to match chapter end
    start_line: int | None = None  # Line where start pattern matched
    end_line: int | None = None  # Line where end pattern matched
    is_valid: bool = False  # Whether patterns matched exactly once


@dataclass
class ChapterExtractionResult:
    """Result of extracting a single chapter."""

    chapter_number: int
    chapter_title: str
    text: str
    start_line: int
    end_line: int
    word_count: int
    verification_passed: bool
    verification_notes: str | None = None


class ChapterIdentificationSignature(dspy.Signature):
    """Identify all chapters in a text sample."""

    text_sample: str = dspy.InputField(
        desc="Representative sample of the text (first 2000-3000 lines)"
    )

    chapter_count: int = dspy.OutputField(desc="Total number of chapters detected")
    chapter_list: str = dspy.OutputField(
        desc="List of chapters with titles, one per line, format: '1. Chapter Title'"
    )
    analysis: str = dspy.OutputField(
        desc="Brief analysis of the chapter structure and formatting"
    )


class BoundaryPatternSignature(dspy.Signature):
    """Generate unique start/end patterns for a specific chapter."""

    full_text: str = dspy.InputField(desc="The complete text to analyze")
    chapter_number: int = dspy.InputField(
        desc="The chapter number to create patterns for"
    )
    chapter_title: str = dspy.InputField(desc="The expected title of this chapter")

    start_pattern: str = dspy.OutputField(
        desc="Regex pattern that uniquely matches the start of this chapter"
    )
    end_pattern: str = dspy.OutputField(
        desc="Regex pattern that uniquely matches the end of this chapter (start of next chapter or end marker)"
    )
    pattern_explanation: str = dspy.OutputField(
        desc="Explanation of what the patterns match and why they're unique"
    )


class ChapterVerificationSignature(dspy.Signature):
    """Verify that extracted text is the correct chapter."""

    extracted_text: str = dspy.InputField(
        desc="The text extracted using the boundary patterns"
    )
    expected_chapter_number: int = dspy.InputField(
        desc="The chapter number we expect this to be"
    )
    expected_chapter_title: str = dspy.InputField(
        desc="The title we expect for this chapter"
    )

    is_correct: bool = dspy.OutputField(
        desc="True if this is the correct and complete chapter"
    )
    confidence: float = dspy.OutputField(desc="Confidence score between 0.0 and 1.0")
    notes: str = dspy.OutputField(desc="Any issues found or confirmation details")


class ChapterDetector:
    """Chapter detector using specific boundary patterns."""

    def __init__(self, model: str | None = None):
        if model is None:
            model = "gemini/gemini-2.0-flash-001"

        configure_dspy_for_pipeline(model)

        # DSPy components
        self.chapter_identifier = dspy.ChainOfThought(ChapterIdentificationSignature)
        self.boundary_generator = dspy.ChainOfThought(BoundaryPatternSignature)
        self.chapter_verifier = dspy.ChainOfThought(ChapterVerificationSignature)

    def identify_chapters(
        self, text: str, sample_size: int = 3000
    ) -> tuple[int, list[tuple[int, str]]]:
        """Identify all chapters in the text.

        Returns:
            Tuple of (chapter_count, list of (number, title) tuples)
        """
        # Take a representative sample
        lines = text.split("\n")
        sample_lines = lines[:sample_size] if len(lines) > sample_size else lines
        sample_text = "\n".join(sample_lines)

        # Identify chapters
        result = self.chapter_identifier(text_sample=sample_text)

        # Parse chapter list
        chapters = []
        for line in result.chapter_list.split("\n"):
            line = line.strip()
            if line and ". " in line:
                try:
                    num_str, title = line.split(". ", 1)
                    num = int(num_str)
                    chapters.append((num, title))
                except ValueError:
                    continue

        return result.chapter_count, chapters

    async def generate_boundary_patterns_async(
        self, text: str, chapter_number: int, chapter_title: str
    ) -> ChapterBoundaryPair:
        """Generate boundary patterns for a single chapter (async)."""
        result = await anyio.run_sync_in_worker_thread(
            lambda: self.boundary_generator(
                full_text=text,
                chapter_number=chapter_number,
                chapter_title=chapter_title,
            )
        )

        return ChapterBoundaryPair(
            chapter_number=chapter_number,
            chapter_title=chapter_title,
            start_pattern=result.start_pattern,
            end_pattern=result.end_pattern,
        )

    async def generate_all_boundaries(
        self, text: str, chapters: list[tuple[int, str]]
    ) -> list[ChapterBoundaryPair]:
        """Generate boundary patterns for all chapters concurrently."""
        async with anyio.create_task_group() as tg:
            results = []

            async def collect_result(num: int, title: str):
                result = await self.generate_boundary_patterns_async(text, num, title)
                results.append(result)

            for num, title in chapters:
                tg.start_soon(collect_result, num, title)

        # Sort by chapter number to maintain order
        results.sort(key=lambda x: x.chapter_number)
        return results

    def validate_patterns(
        self, text: str, boundary_pairs: list[ChapterBoundaryPair]
    ) -> list[ChapterBoundaryPair]:
        """Validate that each pattern matches exactly once."""
        lines = text.split("\n")

        for pair in boundary_pairs:
            # Test start pattern
            start_matches = []
            try:
                start_regex = re.compile(
                    pair.start_pattern, re.IGNORECASE | re.MULTILINE
                )
                for i, line in enumerate(lines):
                    if start_regex.search(line):
                        start_matches.append(i)
            except re.error:
                pair.is_valid = False
                continue

            # Test end pattern
            end_matches = []
            try:
                end_regex = re.compile(pair.end_pattern, re.IGNORECASE | re.MULTILINE)
                for i, line in enumerate(lines):
                    if end_regex.search(line):
                        end_matches.append(i)
            except re.error:
                pair.is_valid = False
                continue

            # Validate exactly one match each
            if len(start_matches) == 1 and len(end_matches) == 1:
                pair.start_line = start_matches[0]
                pair.end_line = end_matches[0]
                pair.is_valid = pair.start_line < pair.end_line
            else:
                pair.is_valid = False

        return boundary_pairs

    def extract_chapter(
        self, text_lines: list[str], boundary_pair: ChapterBoundaryPair
    ) -> str:
        """Extract chapter text using validated boundaries."""
        if not boundary_pair.is_valid:
            return ""

        # Extract from start to end (inclusive)
        if boundary_pair.start_line is None or boundary_pair.end_line is None:
            return ""

        chapter_lines = text_lines[
            boundary_pair.start_line : boundary_pair.end_line + 1
        ]

        return "\n".join(chapter_lines)

    async def verify_chapter_async(
        self, extracted_text: str, chapter_number: int, chapter_title: str
    ) -> tuple[bool, float, str]:
        """Verify extracted chapter content (async)."""
        result = await anyio.run_sync_in_worker_thread(
            lambda: self.chapter_verifier(
                extracted_text=extracted_text[
                    :2000
                ],  # First 2000 chars for verification
                expected_chapter_number=chapter_number,
                expected_chapter_title=chapter_title,
            )
        )

        return result.is_correct, result.confidence, result.notes

    async def extract_all_chapters(self, text: str) -> list[ChapterExtractionResult]:
        """Complete pipeline to extract all chapters."""
        # Step 1: Identify chapters
        chapter_count, chapters = self.identify_chapters(text)
        print(f"Identified {chapter_count} chapters")

        # Step 2: Generate boundary patterns concurrently
        boundary_pairs = await self.generate_all_boundaries(text, chapters)

        # Step 3: Validate patterns (exactly one match each)
        boundary_pairs = self.validate_patterns(text, boundary_pairs)
        valid_count = sum(1 for p in boundary_pairs if p.is_valid)
        print(f"Valid boundary pairs: {valid_count}/{len(boundary_pairs)}")

        # Step 4: Extract and verify chapters
        text_lines = text.split("\n")
        results = []

        for pair in boundary_pairs:
            if not pair.is_valid:
                continue

            # Extract chapter
            chapter_text = self.extract_chapter(text_lines, pair)

            # Verify extraction
            is_correct, confidence, notes = await self.verify_chapter_async(
                chapter_text, pair.chapter_number, pair.chapter_title
            )

            result = ChapterExtractionResult(
                chapter_number=pair.chapter_number,
                chapter_title=pair.chapter_title,
                text=chapter_text,
                start_line=pair.start_line or 0,
                end_line=pair.end_line or 0,
                word_count=len(chapter_text.split()),
                verification_passed=is_correct and confidence > 0.8,
                verification_notes=notes,
            )
            results.append(result)

        return results


def extract_chapters(
    text: str, model: str | None = None
) -> list[ChapterExtractionResult]:
    """Synchronous wrapper for chapter extraction."""
    detector = ChapterDetector(model)

    # Run async function in sync context
    return anyio.run(detector.extract_all_chapters, text)
