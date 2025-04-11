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

### 2.2: Implement the Chunking Algorithm
- Create the main `chunk_text()` method that:
  - Preprocesses the input text
  - Divides text at natural paragraph boundaries
  - Ensures proper overlap between chunks
  - Handles edge cases (short texts, no paragraph breaks)

### 2.3: Add Preprocessing Rules
- Implement regex patterns for common text cleanup:
  - Normalize whitespace and line endings
  - Remove publication metadata
  - Handle Project Gutenberg headers/footers
  - Strip table of contents sections

### 2.4: Test the Chunker
- Create unit tests with various input patterns:
  - Short texts below the chunk threshold
  - Long texts requiring multiple chunks
  - Texts with different paragraph structures
  - Texts with common metadata patterns

## Stage 3: Command-Line Interface

### 3.1: Create the CLI Structure
- Setup the argument parser with all required options
- Implement stdin/stdout handling
- Add error handling and reporting

### 3.2: Integrate Chunker and Flow
- Connect the TextChunker with the PassageExtractorFlow
- Track chunk origins in passage metadata
- Implement progress reporting to stderr

### 3.3: Format Output Handling
- Create JSONL conversion functionality
- Implement output routing (stdout vs file)
- Ensure proper encoding and error handling

### 3.4: Add Usage Documentation
- Create clear help text for the command-line options
- Add examples of common usage patterns
- Document environment requirements

## Stage 4: Integration and Testing

### 4.1: Setup Package Structure
- Create any missing __init__.py files
- Ensure proper module imports
- Make CLI script executable

### 4.2: End-to-End Testing
- Test with various input sources:
  - Project Gutenberg texts
  - Plain text files
  - Short and long documents
- Verify all CLI options work as expected

### 4.3: Performance Testing
- Test with very large texts (novels, etc.)
- Measure and optimize token usage
- Benchmark processing times

### 4.4: Error Handling
- Add robust error handling for all failure modes:
  - API errors
  - Malformed input
  - Empty or invalid chunks
  - Failed passage extraction

## Stage 5: Documentation and Refinement

### 5.1: Create User Documentation
- Document complete CLI usage with examples
- Explain all options and their effects
- Provide sample shell scripts for common use cases

### 5.2: Enhance Validation
- Refine quality metrics and scoring
- Add additional validation options
- Implement filtering options for low-quality passages

### 5.3: Add Telemetry
- Track key metrics for optimization:
  - Success rate for different text types
  - Quality score distributions
  - Token usage patterns

### 5.4: Final Code Review
- Ensure code follows project style guidelines
- Check for potential performance optimizations
- Verify all edge cases are handled
- Ensure documentation is complete