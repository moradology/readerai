# Passage Extractor

## 1. Overview

### 1.1 Purpose
The Passage Extractor breaks down longer texts into semantically coherent, self-contained segments that can serve as the foundation for comprehension and vocabulary exercises.

### 1.2 Importance
Proper text segmentation is critical for creating meaningful learning interactions. By identifying natural "semantic joints" in text, we can present children with manageable chunks that maintain narrative integrity.

## 2. Functionality

### 2.1 Text Processing
- Cleans and normalizes raw text input
- Handles various formatting styles and special characters
- Preserves important structural elements like paragraph breaks
- Identifies and strips extraneous front/back matter (e.g., Project Gutenberg license information, publication details, transcriber notes)
- Focuses extraction only on the actual narrative or educational content

### 2.2 Semantic Analysis
- Identifies natural topic transitions
- Recognizes discourse markers that signal shifts
- Maps rhetorical structure to find coherent boundaries
- Uses paragraph boundaries as initial signals

### 2.3 Passage Generation
- Creates passages of appropriate length (typically 3-7 paragraphs)
- Ensures each passage contains complete thoughts or narratives
- Avoids breaking tightly connected content
- Generates descriptive titles for each passage

### 2.4 Metadata Enhancement
- Extracts key concepts and entities from each passage
- Determines reading level and complexity metrics
- Provides contextual information for downstream processing

## 3. Implementation

### 3.1 LLM Prompt Strategy
```
You are an expert at analyzing text structure and identifying semantic boundaries. Your task is to divide the following text into semantically self-contained passages that could each stand on their own for comprehension questions.

TEXT:
{full_text}

INSTRUCTIONS:
1. FIRST: Identify and ignore any front/back matter that isn't part of the main content (publishing information, licenses, table of contents, indexes, etc.)
2. Identify natural breaks where the text shifts to a new topic, argument, or narrative segment
3. Aim for passages of roughly {target_length} paragraphs (3-7 paragraphs is ideal)
4. Ensure each passage has sufficient context to be understood independently
5. Mark each passage with a descriptive title that captures its main idea
6. Number each passage sequentially

Provide your response as a list of passages with their titles. Do NOT include any front matter, copyright notices, publication information, or other non-narrative content in your passages.
```

### 3.2 Quality Metrics
- Coherence: Complete thoughts within each passage
- Independence: Understandable without external context
- Right-sizing: Substantial yet digestible segments
- Natural boundaries: Divisions at logical points
- Title relevance: Accurately reflects passage content
- Content purity: Free from extraneous publishing information, licensing text, or other non-narrative elements

### 3.3 Command Interface
```
python -m readerai.flows.passage_extractor --input_file [path] --output_file [path] --min_paragraphs [int] --max_paragraphs [int]
```

## 4. Integration Points

### 4.1 Upstream Dependencies
- Text sources (books, stories, educational materials)
- Format conversion utilities
- Source-specific preprocessing (e.g., Project Gutenberg text cleanup)

### 4.2 Downstream Consumers
- Comprehension question generator
- Vocabulary identifier
- Reading level analyzer
- TTS narration system