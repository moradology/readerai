/**
 * WebSocket Message Types for Reading Interactions
 *
 * Defines the message protocol for real-time reading interactions including:
 * - Student interruptions and questions
 * - Audio control messages
 * - LLM responses
 * - Session state synchronization
 */

import type { WebSocketMessage } from '@providers/types';

/**
 * Client -> Server Messages
 *
 * IMPORTANT: Each message is scoped to a single student's private session.
 * There is NO shared state between students - they read independently.
 */

// Student initiates an interruption with a question
export interface StudentInterruptionMessage extends WebSocketMessage {
  type: 'STUDENT_INTERRUPTION';
  payload: {
    questionText: string;
    // Context specific to THIS student's reading session
    context: {
      currentWordIndex: number;
      currentSentence: string;
      surroundingText: string;
      audioTimestamp: number;
      // Session-specific context (added by backend from WebSocket connection)
      sessionId?: string;
      bookId?: string;
      studentId?: string;
    };
    // Optional metadata
    interruptionType?: 'voice' | 'button' | 'gesture';
  };
}

// Student indicates they're ready to continue
export interface ResumeReadingMessage extends WebSocketMessage {
  type: 'RESUME_READING';
  payload: {
    understood: boolean;
    // Optional feedback on the answer
    helpful?: boolean;
    // Time spent on the interruption
    timeSpent?: number;
  };
}

// Student requests to repeat audio from a specific point
export interface RepeatAudioMessage extends WebSocketMessage {
  type: 'REPEAT_AUDIO';
  payload: {
    fromWordIndex: number;
    reason?: 'missed' | 'unclear' | 'review';
  };
}

/**
 * Server -> Client Messages
 */

// Server acknowledges interruption and pauses reading
export interface InterruptionAcknowledgedMessage extends WebSocketMessage {
  type: 'INTERRUPTION_ACKNOWLEDGED';
  payload: {
    pausedAtWordIndex: number;
    pausedAtTimestamp: number;
    processingEstimate?: number; // Estimated seconds for LLM response
  };
}

// Server sends LLM response to student's question
export interface InterruptionResponseMessage extends WebSocketMessage {
  type: 'INTERRUPTION_RESPONSE';
  payload: {
    responseText: string;
    // Response can include rich content
    responseType: 'text' | 'definition' | 'explanation' | 'example' | 'mixed';
    // Optional structured data for special response types
    structuredData?: {
      word?: string;
      definition?: string;
      examples?: string[];
      relatedWords?: string[];
      difficulty?: 'easy' | 'medium' | 'hard';
    };
    // Suggested follow-up actions
    suggestions?: Array<{
      text: string;
      action: 'repeat' | 'continue' | 'ask_more' | 'practice';
    }>;
  };
}

// Server indicates audio should pause
export interface PauseAudioMessage extends WebSocketMessage {
  type: 'PAUSE_AUDIO';
  payload: {
    reason: 'student_interruption' | 'checkpoint' | 'system';
    atWordIndex: number;
    atTimestamp: number;
  };
}

// Server indicates audio should resume
export interface ResumeAudioMessage extends WebSocketMessage {
  type: 'RESUME_AUDIO';
  payload: {
    fromWordIndex: number;
    fromTimestamp: number;
    // Optional speed adjustment based on comprehension
    playbackRate?: number;
  };
}

// Server indicates an error occurred processing the interruption
export interface InterruptionErrorMessage extends WebSocketMessage {
  type: 'INTERRUPTION_ERROR';
  payload: {
    errorCode: 'llm_unavailable' | 'invalid_context' | 'timeout' | 'unknown';
    userMessage: string;
    // Fallback action
    fallbackAction: 'continue' | 'retry' | 'skip';
  };
}

/**
 * Union types for type guards
 */
export type ClientInterruptionMessage =
  | StudentInterruptionMessage
  | ResumeReadingMessage
  | RepeatAudioMessage;

export type ServerInterruptionMessage =
  | InterruptionAcknowledgedMessage
  | InterruptionResponseMessage
  | PauseAudioMessage
  | ResumeAudioMessage
  | InterruptionErrorMessage;

export type InterruptionMessage = ClientInterruptionMessage | ServerInterruptionMessage;

/**
 * Type guards
 */
export function isClientInterruptionMessage(msg: WebSocketMessage): msg is ClientInterruptionMessage {
  return ['STUDENT_INTERRUPTION', 'RESUME_READING', 'REPEAT_AUDIO'].includes(msg.type);
}

export function isServerInterruptionMessage(msg: WebSocketMessage): msg is ServerInterruptionMessage {
  return [
    'INTERRUPTION_ACKNOWLEDGED',
    'INTERRUPTION_RESPONSE',
    'PAUSE_AUDIO',
    'RESUME_AUDIO',
    'INTERRUPTION_ERROR'
  ].includes(msg.type);
}

/**
 * Interruption state for UI components
 */
export interface InterruptionState {
  isActive: boolean;
  isProcessing: boolean;
  question?: string;
  response?: InterruptionResponseMessage['payload'];
  error?: InterruptionErrorMessage['payload'];
  startTime?: number;
  pausedAtWordIndex?: number;
}
