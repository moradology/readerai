// React hook for managing reading sessions

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ReadingSessionManager,
  ReadingSessionState,
  InterruptionType,
  ComprehensionCheckpoint
} from '../services/ReadingSessionManager';

export interface UseReadingSessionOptions {
  onCheckpoint?: (checkpoint: ComprehensionCheckpoint) => void;
  onError?: (error: Error) => void;
}

export function useReadingSession(options: UseReadingSessionOptions = {}) {
  const managerRef = useRef<ReadingSessionManager | null>(null);
  const [state, setState] = useState<ReadingSessionState>({
    sessionId: null,
    passage: '',
    currentWordIndex: -1,
    currentAudioTime: 0,
    readingState: 'idle',
    wordTimings: [],
    comprehensionCheckpoints: [],
    pendingInterruption: null,
    audioStreamUrl: null,
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize session manager
  useEffect(() => {
    const manager = new ReadingSessionManager({
      onStateChange: setState,
      onWordHighlight: () => {
        // This is handled through state update
      },
      onCheckpoint: options.onCheckpoint,
      onError: (error) => {
        setError(error);
        options.onError?.(error);
      },
    });

    managerRef.current = manager;

    // Initialize the session
    manager.initialize()
      .then(() => setIsInitialized(true))
      .catch((error) => {
        console.warn('Failed to initialize, but continuing:', error);
        setIsInitialized(true); // Continue anyway in demo mode
        // Don't set error state for initialization failures
      });

    // Cleanup on unmount
    return () => {
      manager.cleanup();
    };
  }, []); // Empty deps - only run once

  // Control methods
  const startReading = useCallback(async () => {
    if (!managerRef.current || !isInitialized) return;

    try {
      await managerRef.current.startReading();
    } catch (error) {
      setError(error as Error);
    }
  }, [isInitialized]);

  const pauseReading = useCallback(() => {
    if (!managerRef.current) return;
    managerRef.current.pauseReading();
  }, []);

  const resumeReading = useCallback(async () => {
    if (!managerRef.current) return;

    try {
      await managerRef.current.resumeReading();
    } catch (error) {
      setError(error as Error);
    }
  }, []);

  const interrupt = useCallback((type: InterruptionType, userInput?: string) => {
    if (!managerRef.current) return;
    managerRef.current.interrupt(type, userInput);
  }, []);

  const submitCheckpointAnswer = useCallback(async (answer: string) => {
    if (!managerRef.current) return;

    try {
      await managerRef.current.submitCheckpointAnswer(answer);
    } catch (error) {
      setError(error as Error);
    }
  }, []);

  const seekToWord = useCallback((wordIndex: number) => {
    if (!managerRef.current) return;
    managerRef.current.seekToWord(wordIndex);
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    if (!managerRef.current) return;
    managerRef.current.setPlaybackSpeed(speed);
  }, []);

  // Compute derived state
  const words = state.passage.split(/\s+/).filter(Boolean);
  const progress = words.length > 0
    ? ((state.currentWordIndex + 1) / words.length) * 100
    : 0;

  const isReading = state.readingState === 'reading';
  const isPaused = state.readingState === 'paused';
  const isLoading = state.readingState === 'loading';
  const hasCheckpoint = state.readingState === 'checkpoint';
  const isInterrupted = state.readingState === 'interrupted';

  return {
    // State
    state,
    words,
    progress,
    isInitialized,
    isReading,
    isPaused,
    isLoading,
    hasCheckpoint,
    isInterrupted,
    error,

    // Actions
    startReading,
    pauseReading,
    resumeReading,
    interrupt,
    submitCheckpointAnswer,
    seekToWord,
    setPlaybackSpeed,
  };
}
