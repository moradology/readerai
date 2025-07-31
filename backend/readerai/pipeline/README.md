# Chapter Extraction Pipeline

This directory contains the chapter extraction pipeline for books.

## Overview

The pipeline uses a clean, targeted approach:

1. **Identify Chapters**: LLM analyzes the text and identifies exactly N chapters
2. **Generate Boundaries**: For each chapter, generate unique start/end patterns
3. **Validate Uniqueness**: Each pattern must match exactly once
4. **Verify Content**: LLM confirms the extracted text is correct

## Files

- **`chapter_boundary_detector.py`** - Main implementation
- **`dspy_config.py`** - Configuration for DSPy and LLM usage

## Usage

### CLI Usage

```bash
# Extract chapters from a book
readerai extract-chapters book.txt --output chapters.json

# Use a different model
readerai extract-chapters book.txt --model gemini/gemini-1.5-pro

# Get YAML output
readerai extract-chapters book.txt --format yaml
```

### Programmatic Usage

```python
from readerai.pipeline.chapter_boundary_detector import extract_chapters

# Extract chapters
results = extract_chapters(text)

# Each result contains:
# - chapter_number, chapter_title
# - extracted text
# - start_line, end_line
# - verification_passed (bool)
# - verification_notes (optional)
```

### Async Usage

```python
from readerai.pipeline.chapter_boundary_detector import ChapterDetector

detector = ChapterDetector()
results = await detector.extract_all_chapters(text)
```

## How It Works

Instead of trying to find general patterns that work for all chapters, this approach:

1. **Specific Patterns**: Generates unique regex for each chapter's start and end
2. **Validation**: Ensures each pattern matches exactly once (no false positives)
3. **Verification**: Uses LLM to confirm the extracted content is correct

## Example

See `examples/chapter_detection_example.py` for a detailed walkthrough of how the approach works.

## Environment Variables

Set your API key:

```bash
export GOOGLE_API_KEY="your-api-key"  # For Gemini models
export OPENAI_API_KEY="your-api-key"  # For OpenAI models
```
