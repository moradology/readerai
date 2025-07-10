# Contributing to ReaderAI

Thank you for your interest in contributing to ReaderAI! This document outlines our development process, coding standards, and how to approach adding new features to the project.

## Table of Contents

1. [Development Workflow](#development-workflow)
2. [Feature Development Process](#feature-development-process)
   - [Step 1: Feature Specification](#step-1-feature-specification)
   - [Step 2: Product Requirements Document](#step-2-product-requirements-document)
   - [Step 3: Architectural Decision Records](#step-3-architectural-decision-records)
   - [Step 4: Implementation Prompts](#step-4-implementation-prompts)
   - [Step 5: Implementation and Testing](#step-5-implementation-and-testing)
   - [Step 6: Documentation](#step-6-documentation)
3. [Code Standards](#code-standards)
4. [Testing Guidelines](#testing-guidelines)
5. [Documentation Guidelines](#documentation-guidelines)
6. [Example: Complete Feature Development Cycle](#example-complete-feature-development-cycle)

## Development Workflow

We use a streamlined development workflow:

1. **Issue Creation**: All new features and bugs should start as GitHub issues
2. **Branch Strategy**: Create feature branches from `main` using the naming convention `feature/[issue-number]-short-description`
3. **Pull Requests**: Submit PRs against `main` with clear descriptions of changes

## Feature Development Process

ReaderAI follows a structured approach to feature development that ensures thorough design, documentation, and implementation.

### Step 1: Feature Specification

A feature specification is a high-level overview that defines the feature, its purpose, and its value to users.

**Location**: `ai_docs/specs/[feature-number]_[feature-name]/spec.md`

**Content**:

- Feature description and motivation
- User stories or use cases
- High-level requirements
- Success criteria
- Out of scope items

**Example**: [Passage Extractor Specification](ai_docs/specs/001_passage_extractor/spec.md)

### Step 2: Product Requirements Document

The PRD elaborates on the specification, providing detailed requirements, user workflows, and acceptance criteria.

**Location**: `ai_docs/specs/[feature-number]_[feature-name]/prd.md`

**Content**:

- Detailed feature requirements
- User workflows
- UI/UX considerations (if applicable)
- Performance requirements
- Acceptance criteria
- Analytics and metrics

**Example Structure**:

```markdown
# Feature Name PRD

## Overview

Brief description of the feature.

## Detailed Requirements

1. Requirement 1
   - Sub-requirement 1.1
   - Sub-requirement 1.2
2. Requirement 2
   - Sub-requirement 2.1

## User Workflows

Describe how users will interact with the feature.

## Performance Requirements

Outline expectations for performance.

## Acceptance Criteria

Define what constitutes a complete implementation.
```

### Step 3: Architectural Decision Records

ADRs document important architectural decisions made during feature development.

**Location**: `ai_docs/specs/[feature-number]_[feature-name]/adrs/[adr-number]_[adr-name].md`

**Content** (for each ADR):

- Decision title
- Context and problem statement
- Decision drivers
- Considered options
- Decision outcome
- Consequences (positive and negative)

**Example**: [Passage Extractor LLM Integration Approach](ai_docs/specs/001_passage_extractor/adrs/001_llm_integration_approach.md)

### Step 4: Implementation Prompts

Implementation prompts provide detailed instructions for implementing different aspects of the feature, broken down into logical components and steps.

**Location**: `ai_docs/specs/[feature-number]_[feature-name]/prompts/`

**Types of Implementation Prompts**:

- **Main Implementation Prompt**: Overall implementation strategy and breakdown of components
- **Component-Specific Prompts**: Detailed instructions for specific components or modules
- **Integration Prompts**: How to connect different components together
- **Testing Prompts**: Specific guidance for testing strategies

**Content** (for each prompt):

- Stage-by-stage implementation plan
- Specific coding tasks and their interdependencies
- Technical considerations
- Testing approach

**Example**: [Passage Extractor Implementation Prompt](ai_docs/specs/001_passage_extractor/prompts/implementation_prompt.md)

### Step 5: Implementation and Testing

The actual implementation follows the guidance in the implementation prompts. All code should be well-tested.

**Location**: Appropriate Python modules and test files

**Content**:

- Code files implementing the feature
- Unit tests
- Integration tests
- Performance tests (if applicable)

### Step 6: Documentation

User-facing documentation to help users understand how to use the feature.

**Location**: `ai_docs/specs/[feature-number]_[feature-name]/user_guide.md`

**Content**:

- Installation/setup instructions
- Usage examples
- API documentation
- Troubleshooting guidance

**Example**: [Passage Extractor User Guide](ai_docs/specs/001_passage_extractor/user_guide.md)

## Code Standards

We follow these coding standards:

- Use type hints for all function parameters and return values
- Follow PEP 8 style guidelines
- Write detailed docstrings in Google style format
- Keep functions and methods focused on a single responsibility
- Use meaningful variable and function names

Example of well-formatted code:

```python
def process_data(input_text: str, max_length: int = 100) -> Dict[str, Any]:
    """
    Process the input text and return structured data.

    Args:
        input_text: The raw text to process
        max_length: Maximum length to process (default: 100)

    Returns:
        Dictionary containing the processed data

    Raises:
        ValueError: If input_text is empty
    """
    if not input_text:
        raise ValueError("Input text cannot be empty")

    # Processing logic
    result = {
        "processed": True,
        "length": len(input_text),
        "summary": input_text[:max_length]
    }

    return result
```

## Testing Guidelines

- Write unit tests for all public functions and methods
- Aim for at least 80% test coverage
- Include edge cases and error conditions
- Use pytest for all tests
- Mock external dependencies

## Documentation Guidelines

- Use Markdown for all documentation
- Include code examples for API documentation
- Use diagrams where appropriate (Mermaid.js preferred)
- Keep documentation up-to-date with code changes

## Example: Complete Feature Development Cycle

Here's a complete example of our feature development process:

### 1. Feature Specification

```markdown
# Text-to-Speech Feature Specification

## Overview

Add text-to-speech capabilities to ReaderAI to read passages aloud with natural-sounding voices.

## Motivation

- Enhance accessibility for users with reading difficulties
- Support auditory learners
- Provide flexibility for users to learn while engaged in other activities

## User Stories

- As a user with dyslexia, I want passages read aloud so I can better comprehend the content
- As a parent, I want my child to hear proper pronunciation of words
- As a multitasker, I want to listen to content while doing other activities

## High-Level Requirements

- Convert passage text to natural-sounding speech
- Support multiple voices/accents
- Adjust reading speed
- Pause/resume functionality
- Highlight text as it's being read

## Success Criteria

- Speech sounds natural (not robotic)
- Words are correctly pronounced
- Audio generation is fast (< 2 seconds for typical passage)
- Users can easily control playback

## Out of Scope

- Voice customization
- Multi-language support (initial version English-only)
- Audio editing features
```

### 2. Product Requirements Document

```markdown
# Text-to-Speech PRD

## Overview

This feature will enable ReaderAI to convert text passages to spoken audio, enhancing accessibility and learning options.

## Detailed Requirements

### Audio Generation

1. Convert text passages to high-quality audio
   - Use cloud-based TTS service for natural voice
   - Support SSML for pronunciation control
   - Maximum passage length: 5000 characters
   - Audio format: MP3, 128kbps

### Voice Options

1. Provide multiple voice options
   - At least 2 masculine voices
   - At least 2 feminine voices
   - Allow users to set a default voice
   - Support voice-switching within sessions

### Playback Controls

1. Implement standard audio controls
   - Play/pause
   - Stop
   - Adjust speed (0.5x to 2x)
   - Volume control
2. Text synchronization
   - Highlight words/sentences as they're spoken
   - Allow clicking on text to jump to that position in audio

### Performance Requirements

- Audio generation latency < 2 seconds for typical passage
- Smooth playback without buffering
- Maximum file size: 2MB per minute of audio

## User Workflows

### Basic Playback

1. User selects a passage
2. User clicks "Listen" button
3. System generates audio and begins playback
4. Text is highlighted in sync with audio
5. User can pause/resume/stop playback

### Voice Selection

1. User opens voice settings
2. User selects preferred voice from dropdown
3. System applies voice to current and future passages

## Acceptance Criteria

- Audio generation works for 99.9% of valid English text
- All playback controls function correctly
- Text highlighting accurately syncs with audio
- Voice selection persists between sessions
- Performance meets latency requirements
```

### 3. Architectural Decision Records

```markdown
# ADR-001: Text-to-Speech Service Selection

## Context and Problem Statement

We need to choose a TTS service that provides natural-sounding voices, good performance, and reasonable cost.

## Decision Drivers

- Audio quality (naturalness)
- Latency
- Cost
- API reliability
- Integration complexity

## Considered Options

1. Google Cloud Text-to-Speech
2. Amazon Polly
3. Microsoft Azure Cognitive Services
4. Open source solutions (e.g., Mozilla TTS)

## Decision Outcome

Selected: Google Cloud Text-to-Speech

### Rationale

- Highest quality voices in our evaluation
- Good pricing model for our expected usage
- Extensive SSML support
- Simple REST API
- Existing project integration with Google services

## Consequences

- Positive: High-quality audio with minimal development effort
- Negative: Cloud dependency with potential costs as usage grows
- Negative: Requires network connectivity for TTS generation
```

### 4. Implementation Prompts

#### Main Implementation Prompt

```markdown
# Text-to-Speech Implementation Overview

This document provides the high-level strategy for implementing the TTS feature, breaking it down into separate components that will each have their own detailed prompts.

## Component Breakdown

1. **TTS Service Integration**
   - Google Cloud TTS API client
   - Voice management system
   - Audio caching layer

2. **Audio Player Interface**
   - HTML5 audio player
   - Playback controls
   - Text synchronization

3. **Settings Management**
   - User preferences storage
   - Voice selection interface
   - Default settings

4. **Integration with Passage System**
   - Passage-to-speech pipeline
   - Progress indicators
   - Error handling

## Implementation Strategy

1. Start with the core TTS service integration
2. Build the audio player interface
3. Implement the settings management system
4. Create the integration with the passage system
5. Conduct end-to-end testing

## Key Technical Challenges

- Text/audio synchronization timing
- Caching strategy for efficient audio retrieval
- Handling network interruptions gracefully
- Browser compatibility for audio playback
```

#### Component-Specific Prompt: TTS Service Integration

```markdown
# TTS Service Integration Implementation Prompt

This prompt details how to implement the TTS service integration component.

## Step 1: Setup Google Cloud TTS API Client

### 1.1: Create TTS Service Wrapper

- Create a `TTSService` class in `readerai/tts/service.py`
- Implement authentication using environment variables
- Add error handling for API connection issues
- Create logging for service operations

### 1.2: Implement Basic Conversion Method

- Create a `convert_text_to_speech` method with parameters:
  - `text`: The text to convert
  - `voice`: Voice identifier to use
  - `rate`: Speech rate factor
- Return audio data and metadata
- Add retry logic for temporary failures

### 1.3: Build Request/Response Handling

- Implement request formatting according to Google Cloud API
- Create response parser for audio data
- Handle various audio formats (MP3, WAV)
- Add proper error classification

## Step 2: Voice Management

### 2.1: Create Voice Registry

- Implement a `VoiceRegistry` class in `readerai/tts/voices.py`
- Define standard voices with metadata
- Add methods to list available voices
- Include preview text for each voice

### 2.2: Build Voice Selection Logic

- Implement default voice selection
- Create voice filtering by gender, accent
- Add voice sample generation method
- Implement persistence for user preferences

## Step 3: Audio Caching Layer

### 3.1: Design Cache Structure

- Create cache key generation strategy
- Implement cache storage in `readerai/tts/cache.py`
- Add cache size management
- Implement cache invalidation logic

### 3.2: Integrate Caching with TTS Service

- Modify TTS service to check cache first
- Add background caching for upcoming passages
- Implement cache miss handling
- Add metrics for cache performance

## Step 4: Testing

### 4.1: Unit Tests

- Test API client with mock responses
- Test voice registry functionality
- Test cache operations

### 4.2: Integration Tests

- Test end-to-end conversion
- Test error recovery
- Test cache hit/miss scenarios
```

#### Integration Prompt: Connecting Components

```markdown
# TTS Components Integration Prompt

This prompt guides the integration of the separate TTS components into a cohesive feature.

## Step 1: Connect TTS Service to Audio Player

### 1.1: Create Audio Provider Interface

- Implement `AudioProvider` class that connects TTS service to player
- Handle audio format conversion if needed
- Implement streaming interface for progressive playback
- Add event system for playback state changes

### 1.2: Build Playback Pipeline

- Create audio loading system
- Implement buffering for smooth playback
- Add progress tracking
- Create error handling for playback issues

## Step 2: Integrate with Passage System

### 2.1: Add TTS Controls to Passage View

- Add "Listen" button to passage display
- Create audio player UI component
- Implement text highlighting during playback
- Add settings access

### 2.2: Implement Passage-to-Speech Flow

- Create method to convert passage to audio
- Add metadata for synchronization
- Implement caching strategy specific to passages
- Add progress indicators

## Step 3: Connect Settings System

### 3.1: Build Settings UI

- Create voice selection interface
- Implement playback preference controls
- Add accessibility options
- Create persistent storage for settings

### 3.2: Implement Settings Application

- Add code to apply settings to TTS service
- Implement settings change listeners
- Add default fallbacks
- Create reset functionality

## Step 4: End-to-End Testing

### 4.1: Test Complete User Flows

- Test passage selection to audio playback
- Test settings changes
- Test error scenarios
- Test browser compatibility
```

### 5. User Guide

```markdown
# Text-to-Speech Feature User Guide

## Overview

The Text-to-Speech feature allows you to listen to any passage in ReaderAI. This guide explains how to use this feature.

## Getting Started

### Playing a Passage

1. Open any passage in ReaderAI
2. Click the "Listen" button at the bottom of the passage
3. The passage will begin playing automatically

### Controlling Playback

The audio player provides several controls:

- Play/Pause: Toggle playback
- Stop: Stop playback and reset to beginning
- Speed: Adjust from 0.5x (slower) to 2x (faster)
- Volume: Adjust using the volume slider or mute button

### Following Along with Text

As the passage is read, the current word will be highlighted. You can:

- Click any word to jump to that point in the audio
- Scroll through the text while listening

## Choosing a Voice

ReaderAI offers several voice options:

1. Open Settings (gear icon in the top right)
2. Select the "Voice" tab
3. Choose from available voices:
   - Emma (feminine, US accent)
   - James (masculine, US accent)
   - Sophie (feminine, UK accent)
   - William (masculine, UK accent)
4. Click "Save" to apply your selection

Your voice preference will be remembered for future sessions.

## Troubleshooting

### No audio playing

- Check your device volume
- Try refreshing the page
- Ensure your browser allows autoplay

### Audio sounds unnatural

- Some specialized terms may be mispronounced
- Try a different voice option
- For technical terms, slower playback may improve clarity

### Playback is slow or stuttering

- Check your internet connection
- Try a lower quality setting in Options
- Close other browser tabs using audio
```

This example demonstrates the complete lifecycle of developing the Text-to-Speech feature, from initial specification through detailed requirements, architecture decisions, implementation planning via multiple focused prompts, and user documentation.
