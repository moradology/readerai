# Spec-to-ADR Prompt

## Purpose
This prompt helps identify and generate Architecture Decision Records (ADRs) from specification documents by analyzing key technical decisions that need to be made, while ensuring alignment with project guidelines and overall vision.

## Prompt Template

```
You are an experienced software architect specializing in AI systems. Your task is to analyze a specification document and identify key architectural decisions that need to be made, while ensuring alignment with the project's guidelines and overall vision.

## PROJECT OVERVIEW
{project_overview_content}

## PROJECT GUIDELINES
{project_guidelines_content}

## SPECIFICATION DOCUMENT
{specification_content}

## INSTRUCTIONS

1. First, analyze how the specification relates to the project overview and guidelines. Ensure any decisions you recommend will:
   - Support the project's vision and core value proposition
   - Align with established engineering principles (KISS, YAGNI, SOLID)
   - Leverage approved technologies and libraries (DSPy, FastAPI, etc.)
   - Follow the modular "flows" architecture pattern

2. Identify 2-4 critical architectural decisions that need to be made. Focus on decisions that:
   - Have significant technical implications
   - Present multiple viable implementation options
   - Will substantially impact the system's behavior, performance, or maintainability
   - Involve technology choices or approach decisions

3. For each identified decision point:
   - Create a clear decision statement (what needs to be decided)
   - Identify 2-3 viable options for addressing this decision
   - For each option, provide key pros and cons
   - Highlight alignment with project guidelines and principles
   - Note any tensions or trade-offs with established principles

4. Format each decision point like this:
   
   ### Decision Point: [Brief title]
   **What needs to be decided:** [1-2 sentence description]
   
   **Related project principles:** [Identify which project principles/guidelines this decision impacts]
   
   **Options:**
   1. **[Option 1 Name]**
      - Description: [Brief description]
      - Pros: [Bullet list]
      - Cons: [Bullet list]
      - Alignment: [How well this aligns with project principles]
   
   2. **[Option 2 Name]**
      - Description: [Brief description]
      - Pros: [Bullet list]
      - Cons: [Bullet list]
      - Alignment: [How well this aligns with project principles]
   
   **Key considerations:** [Any important factors to consider]
   
   **Questions for stakeholders:** [1-3 specific questions you need answered to make this decision]

5. For each decision point, clearly identify any information gaps or questions that need stakeholder input to resolve.

6. Conclude with a summary of how these decisions will collectively impact the specification's implementation and alignment with the overall project vision.
```

## Usage Instructions

1. Replace the placeholder variables:
   - `{project_overview_content}` with the content from ai_docs/project_overview.md
   - `{project_guidelines_content}` with the content from ai_docs/project_guidelines.md
   - `{specification_content}` with the content of the referenced specification document

2. Run the prompt through an LLM capable of architectural analysis

3. Review the output for each decision point

4. For each decision point, gather stakeholder input on the identified questions

5. Use the output as the foundation for creating formal ADRs using the ADR template

## Example Response Format

```
# Architectural Decision Analysis for [Spec Name]

## Context and Alignment
[Brief analysis of how this specification relates to the overall project vision and guidelines]

## Decision Point 1: [Title]
**What needs to be decided:** [Description]

**Related project principles:** 
- [Principle 1]
- [Principle 2]

**Options:**
1. **[Option 1]**
   - Description: [...]
   - Pros: [...]
   - Cons: [...]
   - Alignment: [...]

2. **[Option 2]**
   - Description: [...]
   - Pros: [...]
   - Cons: [...]
   - Alignment: [...]

**Key considerations:** [...]

**Questions for stakeholders:**
- [Question 1]
- [Question 2]

## Decision Point 2: [Title]
...

## Summary Impact Analysis
[How these decisions collectively impact the implementation and alignment with project vision]
```