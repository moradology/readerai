# Passage Extractor Streaming Implementation

This document provides a brief overview of the streaming implementation for the Passage Extractor, which enables efficient processing of very large text files.

## Completed Changes

1. **TextChunker Streaming**
   - Implemented `chunk_stream()` method that processes text line-by-line
   - Optimized buffer management to maintain minimal memory footprint
   - Added error handling for malformed input, very long lines, and encodings
   - Added progress reporting for real-time feedback

2. **CLI Enhancements**
   - Added verbose mode for detailed progress reporting
   - Implemented model selection for different LLM backends
   - Added text cleaning options for special characters and formatting
   - Enhanced error handling and recovery for interruptions

3. **Text Cleaning**
   - Created a configurable system for handling special Unicode characters
   - Added options to strip formatting characters like underscores and asterisks
   - Ensured all output uses ASCII equivalents for broader compatibility

4. **Performance Optimizations**
   - Added detailed performance metrics and processing statistics
   - Implemented flush operations for immediate output
   - Enhanced error recovery mechanisms
   - Added timestamp tracking

5. **Documentation**
   - Updated user guide with comprehensive examples
   - Added flow diagrams explaining the streaming architecture
   - Enhanced implementation prompt to reflect streaming approach
   - Added troubleshooting guidance and advanced usage examples

## Architecture Overview

The streaming implementation follows this flow:

1. Input text is read line-by-line from stdin or file
2. Text is accumulated into a buffer until it reaches chunk size
3. Chunks are created at natural paragraph boundaries
4. Each chunk is processed by the LLM to extract passages
5. Passages are immediately written to output as they're created
6. Progress and statistics are reported to stderr in real-time

This approach enables processing text files of any size with nearly constant memory usage.

## Usage Example

```bash
# Process a large book with verbose progress reporting
cat moby_dick.txt | readerai-passages --verbose > moby_dick_passages.jsonl

# Process with custom settings and text cleaning
cat war_and_peace.txt | readerai-passages \
  --max_chunk_size 20000 \
  --chunk_overlap 3000 \
  --clean-text \
  --strip-formatting > passages.jsonl
```

## Next Steps

Potential future enhancements:
1. Parallel processing of multiple chunks
2. Intelligent buffering strategies
3. Enhanced text normalization for different languages
4. Caching mechanisms for repeated processing