# ADR: LLM Integration Approach for Passage Extractor

**Decision ID:** 001-001
**Status:** Accepted
**Date:** 2025-04-11
**Authors:** ReaderAI Team

## Context

The Passage Extractor is a foundational component of the ReaderAI system, responsible for dividing longer texts into semantically coherent, self-contained segments for comprehension and vocabulary exercises. We need to determine the most effective approach for implementing the LLM integration, considering our project's architecture and principles.

The project guidelines specify DSPy as the framework for LLM prompting with Google's Gemini models, and the architecture follows a modular "flows" pattern. The chosen approach will influence both implementation complexity and consistency with the rest of the system.

## Decision Statement

We need to decide how to implement the passage extractor using LLM technology, specifically whether to use a pure DSPy implementation or a hybrid approach with simple prompts and custom post-processing.

## Options Considered

- **Option 1: Pure DSPy Implementation** – Implement the passage extractor as a DSPy module, leveraging its prompt engineering and optimization capabilities.

  - **Pros:** Consistent with the flows architecture, leverages DSPy optimizations for prompt improvement, follows project standards, better integration with other components.
  - **Cons:** Potential learning curve if team is new to DSPy, might be more complex for a relatively straightforward task.

- **Option 2: Hybrid Approach (Simple Prompt + Post-processing)** – Use direct LLM prompting with custom Python code for post-processing and integration.
  - **Pros:** Simpler implementation for developers not familiar with DSPy, potentially faster initial development, greater control over prompt formatting and result parsing.
  - **Cons:** Less integrated with the flow architecture, may require refactoring later, could create inconsistencies with other components, redundant code patterns.

## Risks & Assumptions

**Risks:**

- Choosing DSPy might slow initial development if the team is not familiar with the framework.
- The hybrid approach may lead to integration challenges with downstream components.
- Either approach might require refactoring as LLM capabilities evolve.

**Assumptions:**

- The passage extractor will need to be maintained and evolved over time.
- The quality of passages will significantly impact downstream components.
- DSPy provides meaningful benefits for prompt optimization in this use case.

**Dependencies:**

- DSPy framework and its compatibility with our chosen LLM provider.
- Experience level of the development team with DSPy.

## Key Considerations

The passage extractor is foundational to downstream components, so its implementation approach will influence the entire system's cohesion. Consistency with the overall architecture should be balanced against implementation simplicity.

## Questions for Stakeholders

- Is there a preference for consistency with the flow pattern over implementation simplicity?
- What level of DSPy expertise exists on the team?
- How important is the ability to iterate on prompts using DSPy's optimization capabilities?

## Decision Rationale

After reviewing architectural requirements and project guidelines, we have decided to adopt a **Modified Option 1: DSPy Structural Implementation** for the passage extractor component.

This decision is based on the following factors:

1. **Architectural Consistency:** Using DSPy as the framework for implementing the passage extractor maintains consistency with the project's established "flows" architecture pattern, facilitating better system cohesion.

2. **Simplified Approach:** We will use DSPy primarily for its structural benefits (signatures, module patterns) rather than its advanced optimization capabilities. This provides architectural consistency without the complexity of building extensive training examples or optimization pipelines at this stage.

3. **Clear Interfaces:** DSPy's signature system creates well-defined interfaces between components, making the passage extractor more easily consumable by downstream components (comprehension, vocabulary flows).

4. **Future Extensibility:** While the initial implementation will use a simple prompting strategy, the DSPy framework provides a path for future enhancements if optimization becomes necessary, without requiring architectural refactoring.

5. **Balanced Implementation:** This approach respects both the KISS and SOLID principles from our guidelines - using a consistent architecture while avoiding unnecessary complexity in the initial implementation.

## Consequences

**Positive consequences:**

- Maintains architectural consistency with other flows in the system
- Creates clear interfaces for downstream components
- Follows established patterns for LLM interaction
- Provides a pathway for future optimization if needed
- Reduces integration friction with other DSPy-based components

**Negative consequences:**

- Slightly more structured implementation compared to direct prompting
- Requires basic understanding of DSPy signatures and modules
- May introduce some overhead compared to raw prompt implementations

## Decision Log

- 2025-04-11 – Proposed
- 2025-04-11 – Accepted

## Implementation Considerations

The implementation should:

1. **Use DSPy Signatures:** Define clear input/output contracts using DSPy signatures

2. **Simple Prompt Strategy:** Implement the prompt described in the specification directly within the DSPy module without complex optimization

3. **Clean Integration:** Ensure the module interfaces cleanly with downstream components

4. **Minimal Complexity:** Focus on structural benefits of DSPy without adding unnecessary complexity
