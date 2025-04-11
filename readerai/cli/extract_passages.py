#!/usr/bin/env python
"""
Extract Passages CLI Tool

This command-line tool extracts semantically coherent passages from text.
It reads from stdin and writes line-delimited JSON to stdout by default.
Uses a streaming approach for memory-efficient processing of large files.
"""

import os
import sys
import json
import time
import re
import argparse
import dspy
from typing import List, Dict, Any, Iterator, TextIO, Optional
from dotenv import load_dotenv

# Try to import the flow and chunker
try:
    from ..flows.passage_extractor import PassageExtractorFlow
    from ..utils.text_chunker import TextChunker
except ImportError:
    # For case when running directly
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    from readerai.flows.passage_extractor import PassageExtractorFlow
    from readerai.utils.text_chunker import TextChunker


def clean_text(text: str, clean_chars=True, strip_formatting=False) -> str:
    """
    Clean text by replacing or removing problematic characters.
    
    Args:
        text: The text to clean
        clean_chars: Whether to replace special Unicode characters with ASCII equivalents
        strip_formatting: Whether to remove formatting characters like underscores and asterisks
        
    Returns:
        Cleaned text with special characters standardized
    """
    if not clean_chars and not strip_formatting:
        return text
    
    # Replace common special Unicode characters with ASCII equivalents
    if clean_chars:
        unicode_replacements = {
            # Smart quotes and apostrophes
            '\u2018': "'",  # Left single quote
            '\u2019': "'",  # Right single quote
            '\u201C': '"',  # Left double quote
            '\u201D': '"',  # Right double quote
            
            # Em and en dashes
            '\u2013': '-',  # En dash
            '\u2014': '--',  # Em dash
            
            # Other special characters
            '\u2026': '...',  # Ellipsis
            '\u2022': '*',    # Bullet point
        }
        
        # Apply Unicode replacements
        for old, new in unicode_replacements.items():
            text = text.replace(old, new)
    
    # Remove formatting indicators if requested
    if strip_formatting:
        # Only remove formatting characters that appear in pairs or as markup
        # Simple approach: just remove all underscores and asterisks
        # This is naive but works for Project Gutenberg emphasis formatting
        text = re.sub(r'_([^_]+)_', r'\1', text)  # _italics_
        text = re.sub(r'\*([^*]+)\*', r'\1', text)  # *emphasis*
    
    return text


def process_stream(input_stream: TextIO, output_stream: TextIO, 
                  extractor: PassageExtractorFlow, chunker: TextChunker,
                  target_length: int, validate_quality: bool = True,
                  verbose: bool = False, clean_chars: bool = True,
                  strip_formatting: bool = False) -> int:
    """
    Process a text stream, extracting passages and writing results as JSONL.
    
    Args:
        input_stream: Source text stream
        output_stream: Output stream for JSONL results
        extractor: The passage extractor flow module
        chunker: Text chunker for breaking large files into chunks
        target_length: Target number of paragraphs per passage
        validate_quality: Whether to perform quality validation
        verbose: Enable detailed progress reporting
        clean_chars: Whether to replace special Unicode characters with ASCII equivalents
        strip_formatting: Whether to remove formatting characters like underscores and asterisks
        
    Returns:
        Number of passages extracted
    """
    passage_count = 0
    chunk_count = 0
    start_time = time.time()
    total_chars_processed = 0
    
    # Process text stream in chunks
    try:
        for chunk in chunker.chunk_stream(input_stream):
            chunk_count += 1
            total_chars_processed += len(chunk)
            elapsed = time.time() - start_time
            
            # Progress reporting
            if verbose:
                print(f"Processing chunk {chunk_count} ({len(chunk)} chars, {total_chars_processed} total)...", 
                      file=sys.stderr)
                if elapsed > 0:
                    print(f"  Rate: {total_chars_processed/elapsed:.2f} chars/sec", file=sys.stderr)
            else:
                print(f"Processing chunk {chunk_count} ({len(chunk)} chars)...", file=sys.stderr)
            
            # Extract passages from this chunk
            try:
                result = extractor(text=chunk, target_length=target_length, validate_quality=validate_quality)
                
                # Process and output passages
                for passage in result.passages:
                    # Add chunk metadata
                    passage['chunk_index'] = chunk_count - 1
                    passage['timestamp'] = time.strftime("%Y-%m-%d %H:%M:%S")
                    
                    # Clean up special characters in the passage content and title
                    passage['content'] = clean_text(passage['content'], clean_chars, strip_formatting)
                    passage['title'] = clean_text(passage['title'], clean_chars, strip_formatting)
                    
                    # Write as JSONL, one passage per line
                    try:
                        output_stream.write(json.dumps(passage, ensure_ascii=True) + "\n")
                        output_stream.flush()  # Ensure immediate output
                        passage_count += 1
                        
                        # Progress report
                        if verbose:
                            print(f"  Extracted passage: {passage['title']}", file=sys.stderr)
                        elif passage_count % 10 == 0:
                            print(f"Extracted {passage_count} passages so far...", file=sys.stderr)
                    except IOError as e:
                        print(f"Error writing to output: {e}", file=sys.stderr)
                        # Continue processing other passages
            
            except Exception as e:
                print(f"Error processing chunk {chunk_count}: {e}", file=sys.stderr)
                # Continue with next chunk
    
    except KeyboardInterrupt:
        print("\nProcessing interrupted by user.", file=sys.stderr)
    except Exception as e:
        print(f"Error during stream processing: {e}", file=sys.stderr)
    
    # Final statistics
    elapsed = time.time() - start_time
    print(f"\nProcessing complete: {chunk_count} chunks, {passage_count} passages extracted", file=sys.stderr)
    if elapsed > 0:
        print(f"Total processing time: {elapsed:.2f} seconds", file=sys.stderr)
        print(f"Average processing rate: {total_chars_processed/elapsed:.2f} chars/sec", file=sys.stderr)
        if passage_count > 0:
            print(f"Average passage size: {total_chars_processed/passage_count:.2f} chars/passage", file=sys.stderr)
    
    return passage_count


def main() -> int:
    """
    Command-line interface for passage extraction.
    Reads from stdin and outputs to stdout by default.
    
    Returns:
        Exit code (0 for success)
    """
    parser = argparse.ArgumentParser(
        description="Extract passages from text.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument('--output_file', type=str, help="Output file path (defaults to stdout)")
    parser.add_argument('--min_paragraphs', type=int, default=3, help="Minimum paragraphs per passage")
    parser.add_argument('--max_paragraphs', type=int, default=7, help="Maximum paragraphs per passage")
    parser.add_argument('--validate', action='store_true', help="Perform quality validation")
    parser.add_argument('--no-validate', dest='validate', action='store_false', help="Skip quality validation")
    parser.add_argument('--max_chunk_size', type=int, default=15000, help="Maximum chunk size in characters")
    parser.add_argument('--chunk_overlap', type=int, default=2000, help="Chunk overlap in characters")
    parser.add_argument('--verbose', '-v', action='store_true', help="Enable verbose progress reporting")
    parser.add_argument('--model', type=str, default='gemini/gemini-2.0-flash-001', 
                       help="LLM model to use (supports Google Gemini models)")
    parser.add_argument('--clean-text', action='store_true', 
                        help="Clean special characters from text (convert to ASCII equivalents)")
    parser.add_argument('--strip-formatting', action='store_true',
                        help="Remove formatting characters like underscores and asterisks")
    parser.set_defaults(validate=True, verbose=False, clean_text=True, strip_formatting=False)
    args = parser.parse_args()
    
    # Load environment variables
    load_dotenv()
    
    # Configure DSPy
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("Error: GOOGLE_API_KEY not found. Please set it in your .env file.", file=sys.stderr)
        return 1
    
    try:
        llm = dspy.LM(args.model, api_key=api_key)
        dspy.settings.configure(lm=llm)
    except Exception as e:
        print(f"Error configuring DSPy with model {args.model}: {e}", file=sys.stderr)
        print("Please check your model configuration and API key.", file=sys.stderr)
        return 1
    
    # Inform about stream processing
    print(f"Starting stream processing from stdin using model: {args.model}...", file=sys.stderr)
    if args.verbose:
        print(f"Configuration:"
              f"\n  - Chunk size: {args.max_chunk_size} chars"
              f"\n  - Chunk overlap: {args.chunk_overlap} chars"
              f"\n  - Paragraphs per passage: {args.min_paragraphs}-{args.max_paragraphs}"
              f"\n  - Quality validation: {args.validate}", file=sys.stderr)
    
    # Target length is midpoint of min/max
    target_length = (args.min_paragraphs + args.max_paragraphs) // 2
    
    # Create chunker and extractor
    chunker = TextChunker(max_chunk_size=args.max_chunk_size, overlap=args.chunk_overlap)
    extractor = PassageExtractorFlow()
    
    # Setup output stream
    output_stream = None
    try:
        if args.output_file:
            output_stream = open(args.output_file, 'w', encoding='utf-8')
        else:
            output_stream = sys.stdout
            
        # Process the text stream
        passage_count = process_stream(
            input_stream=sys.stdin,
            output_stream=output_stream,
            extractor=extractor,
            chunker=chunker,
            target_length=target_length,
            validate_quality=args.validate,
            verbose=args.verbose,
            clean_chars=args.clean_text,
            strip_formatting=args.strip_formatting
        )
        
        # Report results (final summary is now handled in process_stream)
        if args.output_file and not args.verbose:
            print(f"Wrote {passage_count} passages to {args.output_file}", file=sys.stderr)
        
    except KeyboardInterrupt:
        print("\nOperation interrupted by user.", file=sys.stderr)
        return 130  # Standard exit code for Ctrl+C
    except Exception as e:
        print(f"Error in main execution: {e}", file=sys.stderr)
        return 1
    finally:
        # Cleanup
        if args.output_file and output_stream and output_stream is not sys.stdout:
            output_stream.close()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())