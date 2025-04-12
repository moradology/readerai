# ADR Decision Maker Prompt

## Purpose

This prompt helps stakeholders review proposed Architecture Decision Records (ADRs), evaluate options, and complete the ADRs with final decisions, rationales, and consequences.

## Prompt Template

```
You are an experienced technical architect and educational technology expert helping to make architectural decisions for the ReaderAI project. Your task is to review a proposed ADR, evaluate the options, and provide a recommendation with supporting rationale.

## PROPOSED ADR
{adr_content}

## ADDITIONAL CONTEXT (if any)
{additional_context}

## STAKEHOLDER PERSPECTIVES
{stakeholder_perspectives}

## INSTRUCTIONS

1. Carefully analyze the proposed ADR, including:
   - The context and importance of the decision
   - The options being considered with their pros/cons
   - The risks, assumptions, and key considerations
   - The outstanding questions for stakeholders

2. Based on the given stakeholder perspectives (if provided) and your expertise in both technology architecture and educational systems, recommend a decision by:
   - Selecting one of the proposed options OR suggesting a modified/alternative approach
   - Providing clear, detailed rationale for your recommendation
   - Addressing how this decision aligns with project principles and educational goals
   - Answering any outstanding questions noted in the ADR

3. Complete the missing sections of the ADR:
   - **Decision Rationale**: A compelling explanation of why this option is best
   - **Consequences**: Both positive and negative implications of the decision
   - Update the **Decision Log** with "Accepted" status and date

4. Format your response as a complete, updated ADR, ready to be used as the final version. Maintain the original ADR format but replace placeholder text with your detailed analysis.

5. After the updated ADR, provide a brief summary of your key reasoning points and any implementation considerations that the development team should keep in mind.
```

## Usage Instructions

1. Replace the placeholder variables:

   - `{adr_content}` with the full content of the proposed ADR being reviewed
   - `{additional_context}` with any relevant new information, constraints, or factors to consider (optional)
   - `{stakeholder_perspectives}` with input from project stakeholders on their preferences, priorities, or concerns (optional)

2. Run the prompt through an LLM capable of architectural analysis

3. Review the updated ADR and confirm or revise as needed

4. Replace the proposed ADR with the completed version

## Example Stakeholder Perspectives Format

```
**Product Manager:**
- Prioritizes ease of implementation and time to market
- Concerned about impact on end-user experience
- Interested in flexibility for future extensions

**Technical Lead:**
- Emphasizes code maintainability and alignment with existing patterns
- Concerned about technical debt and future refactoring needs
- Prefers solutions that fit well with the team's current skills

**Education Specialist:**
- Focuses on quality of educational content and experience
- Requires adherence to established educational principles
- Needs options that support varied learning approaches

**Performance Engineer:**
- Interested in efficiency and resource utilization
- Prioritizes scalability for handling large volumes of content
- Concerned about response times for interactive components
```

## Example Response Format

```
# ADR: [Title]

**Decision ID:** [ID]
**Status:** Accepted
**Date:** [Today's Date]
**Authors:** [Original Authors]

## Context
[Original context section]

## Decision Statement
[Original decision statement]

## Options Considered
[Original options section]

## Risks & Assumptions
[Original risks & assumptions section]

## Key Considerations
[Original key considerations section]

## Decision Rationale
[Your detailed rationale for the selected option, addressing stakeholder concerns and questions]

## Consequences

**Positive consequences:**
- [Detailed positive consequence 1]
- [Detailed positive consequence 2]
- [Detailed positive consequence 3]

**Negative consequences:**
- [Detailed negative consequence 1]
- [Detailed negative consequence 2]

## Decision Log
- [Original proposal date] – Proposed
- [Today's date] – Accepted

---

## Implementation Recommendations

[Brief summary of key points and implementation considerations for the development team]
```
