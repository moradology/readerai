// ReaderAI API service layer

import fetchClient, { ApiResult } from '../../../shared/services/fetchClient';

// API Types
export interface VocabularyQuestion {
  word: string;
  question: string;
  options: string[];
  feedback?: string;
}

export interface InitialPassageResponse {
  passage: string;
  vocabulary_question: VocabularyQuestion;
}

export interface ChatResponse {
  response: string;
  assessment?: {
    is_correct: boolean;
    feedback: string;
  };
}

export interface ReadingSession {
  id: string;
  passage: string;
  currentPosition: number;
  startTime: string;
  endTime?: string;
  comprehensionCheckpoints: Array<{
    position: number;
    type: 'vocabulary' | 'comprehension' | 'prediction';
    question: string;
    userAnswer?: string;
    isCorrect?: boolean;
    timestamp: string;
  }>;
}

export interface AudioStreamInfo {
  sessionId: string;
  streamUrl: string;
  duration?: number;
  wordTimings?: WordTiming[];
}

export interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  wordIndex: number;
}

// API Methods
export const readerApi = {
  // Get initial passage and vocabulary question
  async getInitialPassage(): Promise<ApiResult<InitialPassageResponse>> {
    return fetchClient<InitialPassageResponse>('/initial_passage_http');
  },

  // Submit an answer or chat message
  async submitMessage(message: string): Promise<ApiResult<ChatResponse>> {
    return fetchClient<ChatResponse>('/chat_http', {
      method: 'POST',
      data: { message },
    });
  },

  // Start a new reading session
  async startReadingSession(passageId?: string): Promise<ApiResult<ReadingSession>> {
    return fetchClient<ReadingSession>('/sessions/start', {
      method: 'POST',
      data: { passageId },
    });
  },

  // Update reading progress
  async updateProgress(sessionId: string, position: number): Promise<ApiResult<void>> {
    return fetchClient<void>(`/sessions/${sessionId}/progress`, {
      method: 'PUT',
      data: { position },
    });
  },

  // Submit comprehension checkpoint answer
  async submitCheckpointAnswer(
    sessionId: string,
    checkpointId: string,
    answer: string
  ): Promise<ApiResult<{ isCorrect: boolean; feedback: string }>> {
    return fetchClient(`/sessions/${sessionId}/checkpoints/${checkpointId}`, {
      method: 'POST',
      data: { answer },
    });
  },

  // Get audio stream information
  async getAudioStreamInfo(sessionId: string): Promise<ApiResult<AudioStreamInfo>> {
    return fetchClient<AudioStreamInfo>(`/audio/stream-info/${sessionId}`);
  },

  // Save session results
  async saveSession(sessionId: string): Promise<ApiResult<{ saved: boolean }>> {
    return fetchClient(`/sessions/${sessionId}/save`, {
      method: 'POST',
    });
  },

  // Get student's reading history
  async getReadingHistory(limit = 10): Promise<ApiResult<ReadingSession[]>> {
    return fetchClient<ReadingSession[]>(`/sessions/history?limit=${limit}`);
  },
};

// Helper to check if result is an error
export function isApiError<T>(result: ApiResult<T>): result is { error: { message: string; statusCode: number } } {
  return 'error' in result && result.error !== undefined;
}
