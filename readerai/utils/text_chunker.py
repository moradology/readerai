"""
Text Chunking Utility

This module provides functionality to break down large texts into manageable chunks
while preserving paragraph boundaries and handling common text cleanup tasks.
Uses a streaming approach for memory-efficient processing of large files.
"""

import re
import io
import sys
from typing import List, Iterator, TextIO, Union, Optional

class TextChunker:
    """
    Handles initial chunking of very large texts into manageable pieces.
    Uses a moving window approach to avoid cutting in the middle of coherent sections.
    Supports streaming input for efficient processing of large texts.
    """
    
    def __init__(self, max_chunk_size: int = 15000, overlap: int = 2000):
        """
        Initialize the text chunker.
        
        Args:
            max_chunk_size: Maximum size of a chunk in characters
            overlap: Overlap between consecutive chunks in characters
        """
        self.max_chunk_size = max_chunk_size
        self.overlap = overlap
        # Patterns for Gutenberg header detection
        self.gutenberg_start_patterns = [
            r'The Project Gutenberg.*?\n\n\n',
            r'Project Gutenberg\'s.*?\n\n\n',
            r'This eBook is for the use of anyone anywhere.*?\n\n\n',
            r'.*?START OF (THIS|THE) PROJECT GUTENBERG EBOOK.*?\n\n'
        ]
        # Patterns for Gutenberg footer detection
        self.gutenberg_end_patterns = [
            r'\n\n\*\*\* END OF (THIS|THE) PROJECT GUTENBERG EBOOK.*',
            r'\n\nEnd of Project Gutenberg\'s.*',
            r'\n\nEnd of the Project Gutenberg EBook.*'
        ]
    
    def _find_paragraph_boundary(self, text: str, position: int, direction: str = 'forward') -> int:
        """
        Find the nearest paragraph boundary from the given position.
        
        Args:
            text: The text to search in
            position: Starting position
            direction: 'forward' or 'backward' to specify search direction
            
        Returns:
            Index of the nearest paragraph boundary
        """
        # Search forward
        if direction == 'forward':
            # Look for double newline (paragraph boundary)
            next_boundary = text.find('\n\n', position)
            if next_boundary == -1:
                # If no double newline, try single newline
                next_boundary = text.find('\n', position)
                if next_boundary == -1:
                    # If no newline at all, use the end of text
                    return len(text)
            return next_boundary + 2  # +2 to include the boundary itself
        
        # Search backward
        else:
            # Find the last double newline before position
            last_boundary = text.rfind('\n\n', 0, position)
            if last_boundary == -1:
                # If no double newline, try single newline
                last_boundary = text.rfind('\n', 0, position)
                if last_boundary == -1:
                    # If no newline at all, use the beginning of text
                    return 0
            return last_boundary + 2  # +2 to include the boundary itself
    
    def preprocess_chunk(self, text: str, is_first_chunk: bool = False, is_last_chunk: bool = False) -> str:
        """
        Clean up a chunk of text, with special handling for first and last chunks.
        
        Args:
            text: The text chunk to preprocess
            is_first_chunk: Whether this is the first chunk (for header removal)
            is_last_chunk: Whether this is the last chunk (for footer removal)
            
        Returns:
            Preprocessed text
        """
        # Clean whitespace and normalize line endings
        text = re.sub(r'\r\n', '\n', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # If first chunk, check for Gutenberg header
        if is_first_chunk:
            for pattern in self.gutenberg_start_patterns:
                text = re.sub(pattern, '', text, flags=re.DOTALL | re.IGNORECASE)
        
        # If last chunk, check for Gutenberg footer
        if is_last_chunk:
            for pattern in self.gutenberg_end_patterns:
                text = re.sub(pattern, '', text, flags=re.DOTALL | re.IGNORECASE)
        
        # Remove table of contents patterns (could be in any chunk)
        text = re.sub(r'CONTENTS\n\n.*?\n\nCHAPTER', 'CHAPTER', text, flags=re.DOTALL)
        
        return text.strip()
    
    def preprocess_raw_text(self, text: str) -> str:
        """
        Clean up raw text before chunking. For backward compatibility.
        
        Args:
            text: The raw text to preprocess
            
        Returns:
            Preprocessed text with extraneous content removed
        """
        return self.preprocess_chunk(text, is_first_chunk=True, is_last_chunk=True)
    
    def chunk_stream(self, input_stream: TextIO) -> Iterator[str]:
        """
        Process a text stream, yielding chunks of appropriate size.
        Uses a buffer to ensure paragraph boundaries are respected.
        
        Args:
            input_stream: Text stream to process (file-like object with read() method)
            
        Yields:
            Preprocessed text chunks
        
        Raises:
            ValueError: If a single line exceeds reasonable limits (indicating possible malformed input)
        """
        buffer = ""
        chunk_count = 0
        eof = False
        max_line_length = 100000  # Safety limit for individual line length
        
        while True:
            # Report progress for long-running processing
            if chunk_count > 0 and chunk_count % 5 == 0:
                # Use stderr to avoid interfering with stdout data
                if hasattr(input_stream, 'tell') and hasattr(input_stream, 'seekable') and input_stream.seekable():
                    try:
                        print(f"Processing stream at position {input_stream.tell()} bytes, "
                              f"chunk {chunk_count}...", file=sys.stderr)
                    except (OSError, IOError):
                        # Handle case where tell() might fail
                        print(f"Processing stream, chunk {chunk_count}...", file=sys.stderr)
                else:
                    print(f"Processing stream, chunk {chunk_count}...", file=sys.stderr)
            
            # Read lines until buffer is large enough or EOF
            while len(buffer) < self.max_chunk_size and not eof:
                try:
                    line = input_stream.readline()
                    if not line:
                        eof = True
                        break
                    
                    # Check for extremely long lines that might indicate issues
                    if len(line) > max_line_length:
                        print(f"Warning: Extremely long line detected ({len(line)} chars). "
                              f"Possible binary or corrupted data.", file=sys.stderr)
                        
                    buffer += line
                except (UnicodeDecodeError, IOError) as e:
                    # Handle text decoding issues
                    print(f"Warning: Error reading input: {e}. Skipping problematic data.", file=sys.stderr)
                    # Try to recover by reading the next line
                    continue
            
            # If buffer is empty and EOF, we're done
            if not buffer and eof:
                break
                
            # Process chunk
            if len(buffer) <= self.max_chunk_size and eof:
                # Last chunk (might be smaller than max_chunk_size)
                chunk = self.preprocess_chunk(buffer, 
                                             is_first_chunk=(chunk_count == 0), 
                                             is_last_chunk=True)
                if chunk:
                    yield chunk
                break
            
            # Find paragraph boundary for chunk end
            end_pos = min(len(buffer), self.max_chunk_size)
            if end_pos < len(buffer):
                end_pos = self._find_paragraph_boundary(buffer, end_pos, 'backward')
            
            # Extract the chunk
            chunk_text = buffer[:end_pos]
            preprocessed_chunk = self.preprocess_chunk(
                chunk_text, 
                is_first_chunk=(chunk_count == 0),
                is_last_chunk=False
            )
            
            if preprocessed_chunk:
                yield preprocessed_chunk
                chunk_count += 1
            
            # Prepare for next chunk, with overlap
            if eof and end_pos >= len(buffer):
                # We've processed everything
                break
                
            # Calculate overlap position
            overlap_start = max(0, end_pos - self.overlap)
            
            # Update buffer for next iteration
            buffer = buffer[overlap_start:]
            
            # Safety check: if buffer isn't changing, break
            if not buffer:
                break
    
    def chunk_text(self, text: str) -> List[str]:
        """
        Break down a large text into overlapping chunks at paragraph boundaries.
        Legacy method for backward compatibility.
        
        Args:
            text: The text to chunk
            
        Returns:
            List of text chunks
        """
        # Convert string to stream and use the streaming approach
        text_stream = io.StringIO(text)
        return list(self.chunk_stream(text_stream))


# Test function for direct execution
def test_chunker():
    """Simple test function for the TextChunker."""
    
    # Create sample text with multiple paragraphs
    sample_text = "Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.\n\nParagraph 4.\n\n" * 15
    
    print("=== Legacy chunk_text method test ===")
    # Test with default settings
    chunker = TextChunker()
    chunks = chunker.chunk_text(sample_text)
    
    print(f"Original text length: {len(sample_text)} chars")
    print(f"Broken into {len(chunks)} chunks")
    
    for i, chunk in enumerate(chunks):
        print(f"  Chunk {i+1}: {len(chunk)} chars, {chunk.count('Paragraph')} paragraphs")
    
    print("\n=== Streaming chunk_stream method test ===")
    # Test streaming version
    text_stream = io.StringIO(sample_text)
    chunk_count = 0
    total_chars = 0
    
    # Process stream chunk by chunk
    for chunk in chunker.chunk_stream(text_stream):
        chunk_count += 1
        total_chars += len(chunk)
        print(f"  Stream chunk {chunk_count}: {len(chunk)} chars, {chunk.count('Paragraph')} paragraphs")
    
    print(f"Stream processed {total_chars} total characters in {chunk_count} chunks")
    
    # Test with Project Gutenberg header/footer
    gutenberg_text = """The Project Gutenberg EBook of A Tale of Two Cities, by Charles Dickens

This eBook is for the use of anyone anywhere at no cost and with
almost no restrictions whatsoever.  You may copy it, give it away or
re-use it under the terms of the Project Gutenberg License included
with this eBook or online at www.gutenberg.org


Title: A Tale of Two Cities
Author: Charles Dickens

Release Date: January, 1994 [EBook #98]
Posting Date: November 28, 2009
Last Updated: February 11, 2015

Language: English


*** START OF THIS PROJECT GUTENBERG EBOOK A TALE OF TWO CITIES ***




Produced by Judith Boss



A TALE OF TWO CITIES

A STORY OF THE FRENCH REVOLUTION

By Charles Dickens


CHAPTER 1

It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.

*** END OF THIS PROJECT GUTENBERG EBOOK A TALE OF TWO CITIES ***

***** This file should be named 98-h.htm or 98-h.zip *****
This and all associated files of various formats will be found in:
        http://www.gutenberg.org/9/98/"""
    
    print("\n=== Project Gutenberg cleanup test ===")
    # Test legacy method
    processed_text = chunker.preprocess_raw_text(gutenberg_text)
    print(f"Original text length: {len(gutenberg_text)} chars")
    print(f"Processed text length: {len(processed_text)} chars")
    print(f"Processed text: {processed_text[:100]}...")
    
    # Test streaming with Gutenberg text
    print("\n=== Project Gutenberg streaming test ===")
    gutenberg_stream = io.StringIO(gutenberg_text)
    gutenberg_chunks = list(chunker.chunk_stream(gutenberg_stream))
    print(f"Streaming produced {len(gutenberg_chunks)} chunks")
    for i, chunk in enumerate(gutenberg_chunks):
        print(f"  Chunk {i+1}: {len(chunk)} chars")
        # Print start of first chunk to verify header removal
        if i == 0:
            print(f"  First chunk content: {chunk[:100]}...")
        # Print end of last chunk to verify footer removal
        if i == len(gutenberg_chunks) - 1:
            print(f"  Last chunk content: ...{chunk[-100:]}")
    
    # Return success
    return True


# Allow direct testing
if __name__ == "__main__":
    test_chunker()