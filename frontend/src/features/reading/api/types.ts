/**
 * Reading API Type Definitions
 *
 * Responsibilities:
 * - Define TypeScript interfaces for all API requests/responses
 * - Passage data structures and metadata
 * - Reading session state interfaces
 * - Checkpoint and question type definitions
 * - WebSocket message types for real-time features
 * - Error response types and status codes
 * - Ensure type safety between frontend and backend
 */

import type { ApiResponse } from '@shared/api/types';

// Passage types
export interface Passage {
  id: string;
  title: string;
  author: string;
  content: string;
  wordCount: number;
  readingLevel: string;
  estimatedDuration: number; // in seconds
  tags: string[];
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface PassageMetadata {
  id: string;
  title: string;
  author: string;
  wordCount: number;
  readingLevel: string;
  estimatedDuration: number;
  tags: string[];
  hasBeenRead: boolean;
  lastReadAt?: string;
  completionPercentage: number;
}

// Word timing for synchronization
export interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  wordIndex: number;
  confidence?: number;
}

// Reading session types
export interface ReadingSession {
  id: string;
  userId: string;
  passageId: string;
  startedAt: string;
  endedAt?: string;
  duration: number; // in seconds
  wordsRead: number;
  currentPosition: number;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  checkpoints: CheckpointResult[];
  interruptions: InterruptionRecord[];
}

export interface CreateSessionRequest {
  passageId: string;
  audioSettings?: {
    voice?: string;
    speed?: number;
    pitch?: number;
  };
}

export interface CreateSessionResponse extends ApiResponse<{
  session: ReadingSession;
  passage: Passage;
  audioUrl: string;
  wordTimings: WordTiming[];
}> {}

// Checkpoint types
export type CheckpointType = 'vocabulary' | 'comprehension' | 'prediction';

export interface Checkpoint {
  id: string;
  position: number; // Word index where checkpoint occurs
  type: CheckpointType;
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer?: string;
  hint?: string;
  explanation?: string;
}

export interface CheckpointResult {
  checkpointId: string;
  answeredAt: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number; // in seconds
  attempts: number;
}

export interface SubmitCheckpointRequest {
  sessionId: string;
  checkpointId: string;
  answer: string;
}

// Interruption types
export type InterruptionType = 'word_meaning' | 'clarification' | 'repeat' | 'question';

export interface InterruptionRecord {
  id: string;
  type: InterruptionType;
  position: number;
  context: string;
  userQuestion?: string;
  response: string;
  timestamp: string;
}

export interface CreateInterruptionRequest {
  sessionId: string;
  type: InterruptionType;
  position: number;
  context: string;
  userQuestion?: string;
}

// Progress tracking
export interface ReadingProgress {
  sessionId: string;
  currentWordIndex: number;
  currentTime: number;
  wordsPerMinute: number;
  comprehensionScore: number;
}

export interface UpdateProgressRequest {
  sessionId: string;
  currentWordIndex: number;
  currentTime: number;
}

// WebSocket message types for real-time features
export interface WSReadingMessage {
  type: 'checkpoint' | 'highlight' | 'pace_adjustment' | 'session_update';
  payload: any;
}

export interface WSCheckpointMessage {
  type: 'checkpoint';
  payload: {
    checkpoint: Checkpoint;
    pauseAt: number; // Word index to pause at
  };
}

export interface WSHighlightMessage {
  type: 'highlight';
  payload: {
    wordIndex: number;
    duration: number;
  };
}

// Search and filter types
export interface PassageFilters {
  search?: string;
  tags?: string[];
  readingLevel?: string[];
  minDuration?: number;
  maxDuration?: number;
  language?: string;
  hasBeenRead?: boolean;
}

// Analytics types
export interface SessionAnalytics {
  sessionId: string;
  wordsPerMinute: number;
  comprehensionScore: number;
  vocabularyScore: number;
  interruptions: number;
  totalPauseTime: number;
  engagementScore: number;
}

// Error types specific to reading feature
export interface ReadingError {
  code: 'PASSAGE_NOT_FOUND' | 'SESSION_EXPIRED' | 'AUDIO_GENERATION_FAILED' | 'INVALID_CHECKPOINT';
  message: string;
  details?: Record<string, any>;
}
