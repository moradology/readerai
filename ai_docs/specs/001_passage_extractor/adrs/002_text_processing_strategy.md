# ADR: Text Processing Strategy for Passage Extractor

**Decision ID:** 001-002
**Status:** Accepted
**Date:** 2025-04-11
**Authors:** ReaderAI Team

## Context

The Passage Extractor needs to process various text inputs, including those from public domain sources like Project Gutenberg that contain extraneous front/back matter (license information, publication details, transcriber notes). Effective handling of this preprocessing step is critical for ensuring that only relevant content is passed to the segmentation phase and ultimately used for reading comprehension activities.

The specification identifies text cleaning, normalization, and structural preservation as important functional requirements. We need to determine the best approach for implementing these preprocessing steps while adhering to project principles.

## Decision Statement

We need to decide whether to handle text preprocessing primarily through the LLM within the segmentation prompt or implement a dedicated rule-based preprocessing pipeline before LLM segmentation.

## Options Considered

- **Option 1: LLM-centric Processing** – Rely primarily on the LLM to clean and process text by including detailed instructions within the segmentation prompt.

  - **Pros:** Simplifies implementation, reduces code complexity, leverages LLM's understanding of text structure, more adaptable to various text formats.
  - **Cons:** Less control over specific processing steps, potentially inconsistent results, higher token usage (and potentially cost), more complex prompts to maintain.

- **Option 2: Rule-based Preprocessing Pipeline** – Implement specific text processing rules and algorithms to clean and normalize text before passing it to the LLM for segmentation.
  - **Pros:** Consistent and predictable results, reduced token usage, better handling of known edge cases, separation of concerns, potentially faster processing.
  - **Cons:** More code to maintain, requires updates for new text formats or sources, less flexible for unexpected input variations.

## Risks & Assumptions

**Risks:**

- LLM-centric approach may produce inconsistent results across different inputs or model versions.
- Rule-based approach may fail on unexpected input formats.
- Either approach might miss important content or incorrectly retain irrelevant content.

**Assumptions:**

- Project Gutenberg texts will be a common source and have predictable formatting patterns.
- The quality of preprocessing directly impacts the quality of passage segmentation.
- Processing time is less critical than accuracy for this component.

**Issues:**

- The variety and unpredictability of input text formats from different sources.

## Key Considerations

Processing Project Gutenberg and similar texts requires reliable removal of front/back matter, which directly impacts the quality of comprehension exercises. The chosen approach should balance implementation simplicity with preprocessing effectiveness.

## Questions for Stakeholders

- What types of text sources will be prioritized initially?
- How important is token efficiency versus implementation simplicity?
- Is there a preference for deterministic processing versus the flexibility of LLM-based approaches?

## Decision Rationale

Based on stakeholder input and technical considerations, we have decided to implement **Option 3: Hybrid Approach with Rule-Based Pipeline for Known Patterns and LLM for Edge Cases**. This modified approach combines the strengths of both considered options.

The hybrid approach will:

1. Implement a lightweight rule-based pipeline specifically targeting known text formats (particularly Project Gutenberg) for:

   - Removal of common license headers and footers
   - Elimination of publication metadata and transcriber notes
   - Basic text normalization (whitespace, encoding issues)

2. Retain LLM-based processing instructions within the segmentation prompt to:
   - Catch any remaining extraneous content missed by the rule-based pipeline
   - Handle unexpected text formats or sources
   - Perform fine-grained semantic decisions about content relevance

This decision is supported by:

1. **Token Efficiency**: Using rules to eliminate obvious non-content sections before sending text to the LLM significantly reduces token usage and associated costs.

2. **Predictable Results**: Rule-based preprocessing provides consistent handling of known patterns while maintaining flexibility for unexpected formats through the LLM.

3. **Educational Integrity**: The combined approach helps ensure that important narrative elements are preserved while extraneous content is removed.

4. **Separation of Concerns**: The preprocessing phase is clearly separated from semantic segmentation, aligning with architectural best practices and the previous ADR's focus on well-defined interfaces.

5. **Consistency with Project Principles**: This approach follows the KISS principle by implementing simple rules for common patterns while leveraging the LLM for more complex decisions.

## Consequences

**Positive consequences:**

- Reduces token usage and associated costs by filtering obvious non-content before LLM processing
- Provides consistent handling of common text sources like Project Gutenberg
- Maintains flexibility for processing diverse text formats
- Creates clear separation between text preprocessing and semantic segmentation
- Allows incremental improvement of rule-based preprocessing as new patterns are identified
- Better preservation of educational content by applying targeted rules for known formats

**Negative consequences:**

- Slightly more complex implementation than a pure LLM approach
- Requires maintenance of both rule-based preprocessing code and LLM prompts
- May require occasional updates to rules as source formats evolve
- Potential for duplicated effort if both rule-based pipeline and LLM target the same patterns

## Decision Log

- 2025-04-11 – Proposed
- 2025-04-11 – Accepted

## Implementation Considerations

1. The rule-based pipeline should implement modular, format-specific preprocessors that can be chained together, starting with a Project Gutenberg-specific processor.

2. Each preprocessor should focus on a specific task (e.g., license removal, whitespace normalization) to maintain separation of concerns.

3. The LLM prompt should still include instructions for identifying and ignoring any remaining front/back matter, serving as a safety net.

4. The implementation should include logging of which preprocessing rules were applied to aid in debugging and quality assessment.

5. Consider adding a configuration option to bypass rule-based preprocessing for testing or for specific content sources where the rules might be counterproductive.
