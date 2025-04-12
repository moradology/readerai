# ADR: Quality Validation Approach for Extracted Passages

**Decision ID:** 001-004
**Status:** Accepted
**Date:** 2025-04-11
**Authors:** ReaderAI Team

## Context

The Passage Extractor specification identifies several quality metrics for evaluating extracted passages: coherence, independence, appropriate length, natural boundaries, title relevance, and content purity. Ensuring consistent quality is essential for the educational effectiveness of the ReaderAI system, as poor passage extraction will negatively impact all downstream learning interactions. We need to determine how to implement quality validation to ensure passages meet these specified metrics.

This decision aligns with the project's emphasis on test-driven development and quality control through validation against educational standards.

## Decision Statement

We need to decide whether to implement an automated validation suite with programmatic checks or utilize LLM-based evaluation for assessing passage quality against our defined metrics.

## Options Considered

- **Option 1: Automated Validation Suite** – Implement programmatic validators that check passages against quantifiable aspects of the quality metrics.

  - **Pros:** Consistent and reproducible validation, predictable behavior, no additional LLM costs, faster execution, integration with automated testing.
  - **Cons:** Difficult to implement for subjective metrics like "coherence" or "natural boundaries," limited scope of validation, potentially rigid criteria.

- **Option 2: LLM-based Evaluation** – Use a separate LLM prompt to evaluate passage quality against all metrics, including subjective ones.
  - **Pros:** Can assess subjective qualities like coherence and natural boundaries, flexible evaluation criteria, potentially closer to human judgment, adaptability to new quality concerns.
  - **Cons:** Additional LLM costs, potential inconsistency between evaluations, harder to integrate with automated testing, potentially slower.

## Risks & Assumptions

**Risks:**

- Automated validation might miss subtle quality issues that impact educational value.
- LLM-based evaluation might be inconsistent or produce false positives/negatives.
- Either approach might slow down the extraction pipeline.

**Assumptions:**

- Quality validation is necessary for maintaining educational effectiveness.
- Some quality aspects are difficult to measure programmatically.
- The validation approach should scale with the volume of content.

**Dependencies:**

- Educational standards for reading comprehension.
- Performance requirements for the passage extraction process.

## Key Considerations

Educational quality is paramount for the project's success; poor passage extraction will negatively impact all downstream learning interactions. The validation approach should balance thoroughness with practical implementation constraints.

## Decision Rationale

After considering technical requirements and the nature of the quality metrics, we have decided to implement **Option 2: LLM-based Evaluation**.

This decision is supported by the following reasons:

1. **Subjective Quality Assessment**: The core quality metrics for passages—coherence, natural boundaries, and independence—are inherently subjective and require human-like judgment that cannot be adequately implemented through rules-based validation.

2. **Implementation Feasibility**: Attempting to develop symbolic checks for concepts like "coherence" or "natural boundaries" would be extremely difficult, if not impossible, as these concepts require contextual understanding and semantic analysis.

3. **Architectural Consistency**: An LLM-based validator aligns with our DSPy implementation approach (ADR 001-001), allowing us to create a consistent pattern for both passage extraction and validation.

4. **Output Compatibility**: The validator can produce structured output in the line-delimited JSON format we've standardized (ADR 001-003), making it easy to integrate validation results with our processing pipeline.

5. **Educational Value Prioritization**: Since educational quality is our primary concern, using the most capable validator (even at some additional cost) aligns with the project's core mission.

To address the known drawbacks of LLM-based validation, we will:

- Implement structured scoring prompts with explicit criteria for each quality dimension
- Batch process passages to reduce per-passage costs
- Store validation results to enable analysis and improvement over time

## Consequences

**Positive consequences:**

- Enables accurate assessment of subjective quality metrics critical for educational value
- Provides detailed feedback on passage quality that can guide improvements
- Flexible approach that can evolve as quality requirements change
- Maintains architectural consistency with other system components
- Can evaluate complex quality factors that would be impossible to check programmatically

**Negative consequences:**

- Introduces additional LLM usage costs beyond the initial extraction process
- May produce somewhat inconsistent evaluations between runs
- Requires careful prompt engineering to ensure reliable assessment
- Adds processing time to the passage extraction pipeline
- More difficult to include in automated testing frameworks

## Decision Log

- 2025-04-11 – Proposed
- 2025-04-11 – Accepted

## Implementation Considerations

1. Design a DSPy module specifically for quality validation with clear input/output signatures
2. Create structured evaluation prompts with explicit criteria for each quality metric
3. Implement batch processing to validate multiple passages in a single call when possible
4. Return validation results in JSONL format matching our data format standard
5. Include both numeric scores and qualitative feedback for each quality dimension
6. Develop a small set of reference passages with known quality characteristics for testing
7. Consider implementing a validation cache to avoid revalidating unchanged passages
