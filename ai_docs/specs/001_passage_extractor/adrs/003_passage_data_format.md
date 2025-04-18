# ADR: Passage Data Format for Extracted Content

**Decision ID:** 001-003
**Status:** Accepted
**Date:** 2025-04-11
**Authors:** ReaderAI Team

## Context

The Passage Extractor produces segmented text passages with associated metadata (titles, key concepts, reading level, etc.) that will be consumed by multiple downstream components including the Comprehension Flow, Vocabulary Flow, and TTS narration system. We need to determine the most appropriate data format for storing and passing these passages to ensure they are easily consumable by all relevant components while supporting the required metadata.

This decision impacts system integration, maintainability, and potentially human review processes for educational content.

## Decision Statement

We need to decide on the data structure and format for storing extracted passages and their associated metadata to optimize for both machine processing and human readability.

## Options Considered

- **Option 1: JSON Structure** – Store passages and metadata in a structured JSON format.

  - **Pros:** Flexible schema that can evolve over time, widely supported in programming languages, easily parseable by other components, good for API responses, strong tooling support.
  - **Cons:** More verbose than plain text, less human-readable for content review, potentially less efficient for storage.

- **Option 2: Markdown with YAML Frontmatter** – Store passages as markdown documents with YAML frontmatter for metadata.
  - **Pros:** Highly human-readable, preserves text formatting for review, familiar to content creators, supports rich text features, visible structure.
  - **Cons:** Requires custom parsing logic in consuming components, less standard than JSON for programmatic use, potential inconsistencies in formatting.

## Risks & Assumptions

**Risks:**

- Chosen format might not accommodate all future metadata requirements.
- Format might be difficult for certain downstream components to process efficiently.
- Human review processes might be hindered by overly technical formats.

**Assumptions:**

- Downstream components will need structured access to both passage text and metadata.
- The format should support the metadata enhancement requirements (concepts, entities, reading level).
- The amount of metadata will grow over time as the system evolves.

**Dependencies:**

- Requirements of downstream components (comprehension, vocabulary, TTS).
- Content review processes by educational experts.

## Key Considerations

The selected format should balance machine processing efficiency with human readability, particularly given the educational focus of the project. It should also be flexible enough to accommodate evolving metadata requirements as the system develops.

## Decision Rationale

After analyzing the requirements and stakeholder perspectives, we have decided to implement **Option 1: JSON Structure**, specifically line-delimited JSON (JSONL), for the passage data format.

This decision is based on several key factors:

1. **Stream Processing Capabilities:** Line-delimited JSON allows passages to be output to stdout and piped into other processes, supporting a Unix-style processing model where outputs can be streamed to downstream components.

2. **Component Integration:** JSON provides a standardized format for all components to consume, making integration simpler and more robust. This aligns with the DSPy-based flows architecture established in ADR 001-001.

3. **Flexibility for Metadata:** JSON's flexible structure can readily accommodate the growing metadata requirements we anticipate as the system evolves, including nested structures for complex metadata like key concepts and reading level assessments.

4. **Standardization:** JSON is universally supported across programming languages and platforms, reducing the need for custom parsers in each component.

5. **Schema Validation:** JSON Schema can be used to validate passage structures, ensuring data integrity throughout the processing pipeline.

While Markdown would offer better human readability, we can address this concern by implementing simple conversion utilities for content review purposes when needed.

## Consequences

**Positive consequences:**

- Enables efficient streaming between components via stdout/pipe mechanisms
- Standardized format with consistent parsing across all system components
- Flexible schema can evolve to accommodate new metadata requirements
- Reduced integration complexity for downstream components
- Compatible with modern data processing tools and techniques
- Well-suited for both file storage and API responses

**Negative consequences:**

- Less immediately human-readable than Markdown for educational content review
- Slightly more verbose storage requirements compared to plain text
- May require additional tooling to convert to human-friendly formats when needed

## Decision Log

- 2025-04-11 – Proposed
- 2025-04-11 – Accepted, with specific recommendation for line-delimited JSON (JSONL)

## Implementation Considerations

1. Implement a standardized JSON schema to define the passage structure
2. Ensure each passage is a complete JSON object on a single line (JSONL format)
3. Output one passage per line to stdout to enable piping to other processes
4. Include minimal required fields initially, with room to extend the schema
5. Consider adding a simple utility to convert between JSONL and human-readable formats for review
