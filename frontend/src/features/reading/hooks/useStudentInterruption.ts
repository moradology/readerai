/**
 * useStudentInterruption Hook
 *
 * Manages the student interruption flow including:
 * - Sending questions to the backend
 * - Handling LLM responses
 * - Coordinating audio pause/resume
 * - Managing UI state during interruptions
 */

import { useState, useCallback, useEffect } from 'react';
import { useAppSelector } from '@app/hooks';
import { selectIsConnected } from '@features/websocket/websocketSlice';
import { useWebSocket } from '@providers/hooks/useWebSocket';
import type { AudioPlayerProvider } from '@providers/types';
import type {
  StudentInterruptionMessage,
  InterruptionResponseMessage,
  InterruptionAcknowledgedMessage,
  InterruptionErrorMessage,
  InterruptionState,
  ServerInterruptionMessage,
} from '../websocket/types';

interface UseStudentInterruptionOptions {
  audioPlayer: AudioPlayerProvider | null;
  currentWordIndex: number;
  currentSentence: string;
  surroundingText: string;
  onInterruptionStart?: () => void;
  onInterruptionEnd?: () => void;
}

interface UseStudentInterruptionReturn {
  // State
  interruption: InterruptionState;
  isConnected: boolean;

  // Actions
  askQuestion: (question: string) => Promise<void>;
  resumeReading: (understood?: boolean, helpful?: boolean) => void;
  repeatAudio: (fromWordIndex: number) => void;
  clearInterruption: () => void;
}

export function useStudentInterruption({
  audioPlayer,
  currentWordIndex,
  currentSentence,
  surroundingText,
  onInterruptionStart,
  onInterruptionEnd,
}: UseStudentInterruptionOptions): UseStudentInterruptionReturn {
  const isConnected = useAppSelector(selectIsConnected);
  const { sendMessage, subscribe } = useWebSocket();

  // Interruption state
  const [interruption, setInterruption] = useState<InterruptionState>({
    isActive: false,
    isProcessing: false,
  });

  // Handle incoming WebSocket messages
  useEffect(() => {
    const handleMessage = (message: ServerInterruptionMessage): void => {
      switch (message.type) {
        case 'INTERRUPTION_ACKNOWLEDGED':
          handleInterruptionAcknowledged(message as InterruptionAcknowledgedMessage);
          break;

        case 'INTERRUPTION_RESPONSE':
          handleInterruptionResponse(message as InterruptionResponseMessage);
          break;

        case 'PAUSE_AUDIO':
          // Audio pause is handled by the audio player directly
          break;

        case 'RESUME_AUDIO':
          // Audio resume is handled by the audio player directly
          break;

        case 'INTERRUPTION_ERROR':
          handleInterruptionError(message as InterruptionErrorMessage);
          break;
      }
    };

    // Subscribe to relevant message types
    const unsubscribeFns = [
      subscribe('INTERRUPTION_ACKNOWLEDGED', handleMessage as any),
      subscribe('INTERRUPTION_RESPONSE', handleMessage as any),
      subscribe('PAUSE_AUDIO', handleMessage as any),
      subscribe('RESUME_AUDIO', handleMessage as any),
      subscribe('INTERRUPTION_ERROR', handleMessage as any),
    ];

    return () => {
      unsubscribeFns.forEach(fn => fn());
    };
  }, [subscribe]);

  // Handle interruption acknowledged
  const handleInterruptionAcknowledged = useCallback((message: InterruptionAcknowledgedMessage) => {
    setInterruption(prev => ({
      ...prev,
      isProcessing: true,
      pausedAtWordIndex: message.payload.pausedAtWordIndex,
    }));
  }, []);

  // Handle interruption response
  const handleInterruptionResponse = useCallback((message: InterruptionResponseMessage) => {
    setInterruption(prev => ({
      ...prev,
      isProcessing: false,
      response: message.payload,
    }));
  }, []);

  // Handle interruption error
  const handleInterruptionError = useCallback((message: InterruptionErrorMessage) => {
    setInterruption(prev => ({
      ...prev,
      isProcessing: false,
      error: message.payload,
    }));
  }, []);

  // Ask a question
  const askQuestion = useCallback(async (question: string) => {
    if (!isConnected) {
      throw new Error('WebSocket not connected');
    }

    // Update local state
    setInterruption({
      isActive: true,
      isProcessing: true,
      question,
      startTime: Date.now(),
    });

    // Pause audio immediately for responsiveness
    if (audioPlayer?.isPlaying()) {
      audioPlayer.pause();
    }

    // Notify parent component
    onInterruptionStart?.();

    // Send interruption message
    const message: StudentInterruptionMessage = {
      type: 'STUDENT_INTERRUPTION',
      payload: {
        questionText: question,
        context: {
          currentWordIndex,
          currentSentence,
          surroundingText,
          audioTimestamp: audioPlayer?.getCurrentTime() || 0,
        },
        interruptionType: 'button', // Could be extended to support voice, etc.
      },
      id: `interruption-${Date.now()}`,
      timestamp: Date.now(),
    };

    sendMessage(message);
  }, [
    isConnected,
    audioPlayer,
    currentWordIndex,
    currentSentence,
    surroundingText,
    sendMessage,
    onInterruptionStart,
  ]);

  // Clear interruption state
  const clearInterruption = useCallback(() => {
    setInterruption({
      isActive: false,
      isProcessing: false,
    });
  }, []);

  // Resume reading
  const resumeReading = useCallback((understood = true, helpful?: boolean) => {
    if (!interruption.isActive) return;

    const timeSpent = interruption.startTime
      ? (Date.now() - interruption.startTime) / 1000
      : undefined;

    // Send resume message
    sendMessage({
      type: 'RESUME_READING',
      payload: {
        understood,
        helpful,
        timeSpent,
      },
      timestamp: Date.now(),
    });

    // Notify parent component
    onInterruptionEnd?.();

    // Clear interruption state
    clearInterruption();
  }, [interruption, sendMessage, onInterruptionEnd, clearInterruption]);

  // Repeat audio from a specific point
  const repeatAudio = useCallback((fromWordIndex: number) => {
    sendMessage({
      type: 'REPEAT_AUDIO',
      payload: {
        fromWordIndex,
        reason: 'review',
      },
      timestamp: Date.now(),
    });
  }, [sendMessage]);

  return {
    interruption,
    isConnected,
    askQuestion,
    resumeReading,
    repeatAudio,
    clearInterruption,
  };
}
