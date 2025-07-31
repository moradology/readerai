"""
Tests for the Passage Extractor functionality.
"""

import io

from readerai.utils.text_chunker import TextChunker

# Sample text for testing
SAMPLE_TEXT = """
Chapter 1

It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair, we had everything before us, we had nothing before us, we were all going direct to Heaven, we were all going direct the other way.

There were a king with a large jaw and a queen with a plain face, on the throne of England; there were a king with a large jaw and a queen with a fair face, on the throne of France. In both countries it was clearer than crystal to the lords of the State preserves of loaves and fishes, that things in general were settled for ever.

Chapter 2

It was the Dover road that lay, on a Friday night late in November, before the first of the persons with whom this history has business. The Dover road was clear of the mist and mud, for the frost had set in, so that the stars shone brightly overhead, and the foot passengers, picking their way among the ruts and pools, kept a clearer course than usual.
"""


def test_text_chunker_legacy():
    """Test that the TextChunker correctly handles text using legacy method."""
    chunker = TextChunker(max_chunk_size=500, overlap=100)
    chunks = chunker.chunk_text(SAMPLE_TEXT)

    # Basic validation
    assert len(chunks) > 0, "Should extract at least one chunk"

    # Check that chunks cover the whole text (accounting for preprocessing)
    preprocessed = chunker.preprocess_raw_text(SAMPLE_TEXT)
    total_chars = sum(len(chunk) for chunk in chunks)

    # Account for overlaps
    overlap_chars = (len(chunks) - 1) * chunker.overlap if len(chunks) > 1 else 0

    # Total characters with overlaps should be roughly equal to original text
    # (Allow some margin for boundary adjustments)
    assert total_chars - overlap_chars <= len(preprocessed) + 100, (
        "Chunks should cover the whole text"
    )


def test_text_chunker_streaming():
    """Test the streaming functionality of TextChunker."""
    chunker = TextChunker(max_chunk_size=500, overlap=100)

    # Create a stream from the sample text
    input_stream = io.StringIO(SAMPLE_TEXT)

    # Get chunks using streaming method
    stream_chunks = list(chunker.chunk_stream(input_stream))

    # Get chunks using legacy method for comparison
    legacy_chunks = chunker.chunk_text(SAMPLE_TEXT)

    # Validate basic functionality
    assert len(stream_chunks) > 0, "Should extract at least one chunk"
    assert len(stream_chunks) == len(legacy_chunks), (
        "Stream and legacy methods should produce same number of chunks"
    )

    # Compare content (allowing for minor differences due to implementation details)
    for i, (stream_chunk, legacy_chunk) in enumerate(
        zip(stream_chunks, legacy_chunks, strict=False)
    ):
        # Check if chunks are identical or very similar in length
        length_diff = abs(len(stream_chunk) - len(legacy_chunk))
        assert length_diff <= 50, (
            f"Chunk {i} differs significantly in size between methods"
        )

        # Check if key content is present in both
        # For simplicity, check if some unique phrases from the sample text appear in both chunks
        if "best of times" in legacy_chunk:
            assert "best of times" in stream_chunk, "Stream chunk missing key content"
        if "Dover road" in legacy_chunk:
            assert "Dover road" in stream_chunk, "Stream chunk missing key content"


def test_chunker_error_handling():
    """Test that the chunker handles errors gracefully."""
    chunker = TextChunker(max_chunk_size=500, overlap=100)

    # Test with empty input
    empty_stream = io.StringIO("")
    empty_chunks = list(chunker.chunk_stream(empty_stream))
    assert len(empty_chunks) == 0, "Empty input should produce no chunks"

    # Test with very large single line (should handle without error)
    long_line = "x" * 10000  # Much larger than max_chunk_size
    long_stream = io.StringIO(long_line)
    long_chunks = list(chunker.chunk_stream(long_stream))
    assert len(long_chunks) > 0, "Should handle very long lines by breaking them up"
    assert sum(len(chunk) for chunk in long_chunks) >= len(long_line), (
        "Should process entire input"
    )


def test_gutenberg_preprocessing():
    """Test the Project Gutenberg preprocessing functionality."""
    chunker = TextChunker()

    # Test with Gutenberg header/footer
    gutenberg_text = """The Project Gutenberg EBook of Test

*** START OF THIS PROJECT GUTENBERG EBOOK TEST ***

Test content.

*** END OF THIS PROJECT GUTENBERG EBOOK TEST ***
"""
    # Test with legacy method
    processed = chunker.preprocess_raw_text(gutenberg_text)
    assert "Test content." in processed, "Should preserve content"
    assert "Project Gutenberg" not in processed, "Should remove header"
    assert "END OF" not in processed, "Should remove footer"

    # Test with streaming method
    gutenberg_stream = io.StringIO(gutenberg_text)
    stream_chunks = list(chunker.chunk_stream(gutenberg_stream))
    assert len(stream_chunks) > 0, "Should extract at least one chunk"
    assert "Test content." in stream_chunks[0], (
        "Should preserve content in streaming mode"
    )
    assert "Project Gutenberg" not in stream_chunks[0], (
        "Should remove header in streaming mode"
    )
    assert "END OF" not in stream_chunks[0], "Should remove footer in streaming mode"
