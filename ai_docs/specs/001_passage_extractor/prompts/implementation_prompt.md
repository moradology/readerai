# Passage Extractor Implementation Prompt

Below is a step-by-step guide to implementing the Passage Extractor feature, broken down into focused sub-tasks. Follow these steps sequentially to ensure a complete, robust implementation.

## Stage 1: Core Passage Extractor Flow

### 1.1: Define DSPy Signatures

- Create `PassageSegmentation` signature with:
  - Input field for text chunk
  - Input field for target paragraph length
  - Output field for list of passage dictionaries
- Create `PassageQualityEvaluation` signature with:
  - Input fields for passage title and content
  - Output fields for the five quality metrics (coherence, independence, etc.)
  - Output field for feedback

### 1.2: Implement the Flow Module

- Create the `PassageExtractorFlow` class extending `dspy.Module`
- Initialize with segmenter and quality evaluator components
- Implement the `forward()` method to:
  - Segment the input text
  - Process the quality metrics if validation is requested
  - Return a structured prediction object

### 1.3: Create Testing Examples and Harness

- Develop test examples with various text patterns
- Setup the main block with:
  - Environment configuration
  - Basic flow execution with TEST_PASSAGE constant
  - Results display formatting
  - Optional integration with MIPROv2 optimizer

### 1.4: Document the Flow API

- Add detailed docstrings for all methods
- Include type annotations for all parameters
- Document the expected format of input and output

## Stage 2: Text Chunking Module

### 2.1: Define the TextChunker Class

- Create the class with configurable chunk size and overlap
- Implement helper methods for finding paragraph boundaries
- Add text preprocessing with common patterns (Gutenberg, etc.)

### 2.2: Implement the Streaming Chunking Algorithm

- Create the main `chunk_stream()` method that:
  - Processes text input as a stream (line by line)
  - Maintains a text buffer of appropriate size
  - Divides text at natural paragraph boundaries
  - Yields chunks incrementally as they are ready
  - Ensures proper overlap between chunks
  - Handles edge cases (short texts, no paragraph breaks)

### 2.3: Implement the Legacy Chunking Algorithm

- Create a `chunk_text()` method that:
  - Takes a full text string as input
  - Leverages the streaming approach internally
  - Returns a list of chunks for backward compatibility
  - Provides a simple interface for non-streaming use cases

### 2.4: Add Preprocessing Rules

- Implement regex patterns for common text cleanup:
  - Normalize whitespace and line endings
  - Remove publication metadata
  - Handle Project Gutenberg headers/footers
  - Strip table of contents sections
  - Clean up special characters and formatting markers

### 2.5: Add Error Handling and Progress Reporting

- Implement error handling for corrupted or malformed text
- Add support for very long lines or binary data
- Implement progress reporting for long-running processes
- Add safety mechanisms to prevent infinite loops or buffer overflows

### 2.6: Test the Chunker

- Create unit tests with various input patterns:
  - Short texts below the chunk threshold
  - Long texts requiring multiple chunks
  - Texts with different paragraph structures
  - Texts with common metadata patterns
  - Streaming vs. non-streaming comparison
  - Error handling cases

## Stage 3: Command-Line Interface

### 3.1: Create the CLI Structure

- Setup the argument parser with all required options:
  - Input/output handling options
  - Chunking parameters
  - Quality validation options
  - Text cleaning options
  - Model selection
  - Performance optimization flags
- Implement stdin/stdout handling
- Add robust error handling and reporting

### 3.2: Implement Stream Processing

- Create a `process_stream()` function that:
  - Takes input and output streams as parameters
  - Uses the TextChunker's streaming capabilities
  - Processes chunks as they become available
  - Writes passages to output immediately after extraction
  - Reports progress to stderr
  - Provides processing statistics
  - Handles interruptions gracefully

### 3.3: Integrate Chunker and Flow

- Connect the TextChunker with the PassageExtractorFlow
- Track chunk origins in passage metadata
- Add timestamps and processing information
- Implement detailed progress reporting to stderr
- Enable verbose mode for detailed processing information

### 3.4: Format Output Handling

- Create JSONL conversion functionality
- Implement text cleaning for special characters
- Handle formatting marker removal options
- Implement output routing (stdout vs file)
- Ensure proper encoding and error handling
- Add flush operations for immediate output

### 3.5: Add Usage Documentation

- Create clear help text for the command-line options
- Add examples of common usage patterns
- Document environment requirements
- Include performance considerations

## Stage 4: Integration and Testing

### 4.1: Setup Package Structure

- Create any missing **init**.py files
- Ensure proper module imports
- Register CLI script entry point in pyproject.toml
- Make CLI script executable

### 4.2: End-to-End Testing

- Test with various input sources:
  - Project Gutenberg texts of various sizes
  - Plain text files with different formats
  - Short and long documents
  - Text with unusual formatting or character sets
  - Very large files (multi-megabyte novels)
- Verify all CLI options work as expected
- Test interruption and resumption behavior

### 4.3: Performance Testing and Optimization

- Test with very large texts (complete novels, etc.)
- Measure and optimize token usage
- Benchmark processing times and memory usage
- Compare streaming vs. non-streaming approaches
- Profile for memory leaks or inefficiencies
- Optimize buffer sizes and overlap parameters
- Test with different LLM models

### 4.4: Error Handling and Recovery

- Add robust error handling for all failure modes:
  - API errors and rate limiting
  - Network interruptions
  - Malformed input or encoding issues
  - Empty or invalid chunks
  - Very long lines or unusual text patterns
  - Corrupted Unicode or binary data
  - Failed passage extraction
  - Memory constraints
- Implement graceful degradation strategies
- Add recovery mechanisms for interrupted processing

## Stage 5: Documentation and Refinement

### 5.1: Create Comprehensive User Documentation

- Document complete CLI usage with detailed examples
- Create diagrams explaining the streaming architecture
- Explain all options and their effects with examples
- Provide sample shell scripts for common use cases
- Document performance characteristics and memory usage
- Add troubleshooting guidance for common issues
- Include advanced usage patterns and techniques

### 5.2: Enhance Validation and Text Processing

- Refine quality metrics and scoring
- Add additional validation options
- Implement filtering options for low-quality passages
- Enhance text cleaning capabilities:
  - Better handling of special characters
  - Smart formatting marker detection
  - Language-specific text normalization
  - Intelligent paragraph boundary detection

### 5.3: Add Telemetry and Observability

- Track key metrics for optimization:
  - Success rate for different text types
  - Processing speed for different chunk sizes
  - Quality score distributions
  - Token usage patterns
  - Memory usage patterns during streaming
  - Error rates and types
- Add detailed logging options for debugging

### 5.4: Performance Optimization

- Implement configurable stream buffering
- Optimize memory usage during processing
- Add parallel processing options for multi-core systems
- Implement caching strategies for repeated processing
- Add options to balance speed vs. quality

### 5.5: Final Code Review and Maintenance

- Ensure code follows project style guidelines
- Check for potential performance optimizations
- Verify all edge cases are handled
- Ensure documentation is complete and accurate
- Add maintenance guidelines for future development
- Document the streaming architecture design decisions
