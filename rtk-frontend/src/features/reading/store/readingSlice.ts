/**
 * Reading Feature Redux Slice
 *
 * Responsibilities:
 * - Manage reading session UI state (current word, playback status)
 * - Track reading progress and position
 * - Store active checkpoints and interruptions
 * - Handle playback control state (play/pause/speed)
 * - Manage word highlighting synchronization
 * - Coordinate with RTK Query for data fetching
 * - Define reducers for reading-related actions
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@app/store';

// Types
export type ReadingStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

export interface ReadingState {
  // Session info
  sessionId: string | null;
  passageId: string | null;
  passageText: string;

  // Playback state
  status: ReadingStatus;
  currentWordIndex: number;
  currentTime: number;
  duration: number;
  playbackRate: number;

  // Progress
  wordsRead: number;
  progressPercentage: number;

  // UI state
  isHighlightingEnabled: boolean;
  volume: number;

  // Error handling
  error: string | null;
}

const initialState: ReadingState = {
  sessionId: null,
  passageId: null,
  passageText: '',
  status: 'idle',
  currentWordIndex: -1,
  currentTime: 0,
  duration: 0,
  playbackRate: 1.0,
  wordsRead: 0,
  progressPercentage: 0,
  isHighlightingEnabled: true,
  volume: 1.0,
  error: null,
};

export const readingSlice = createSlice({
  name: 'reading',
  initialState,
  reducers: {
    // Session management
    initializeSession: (state, action: PayloadAction<{
      sessionId: string;
      passageId: string;
      passageText: string;
      duration: number;
    }>) => {
      state.sessionId = action.payload.sessionId;
      state.passageId = action.payload.passageId;
      state.passageText = action.payload.passageText;
      state.duration = action.payload.duration;
      state.status = 'loading';
      state.error = null;
    },

    // Playback controls
    play: (state) => {
      if (state.status === 'paused' || state.status === 'idle') {
        state.status = 'playing';
      }
    },

    pause: (state) => {
      if (state.status === 'playing') {
        state.status = 'paused';
      }
    },

    stop: (state) => {
      state.status = 'idle';
      state.currentWordIndex = -1;
      state.currentTime = 0;
      state.progressPercentage = 0;
    },

    // Progress updates
    updateProgress: (state, action: PayloadAction<{
      currentWordIndex: number;
      currentTime: number;
    }>) => {
      state.currentWordIndex = action.payload.currentWordIndex;
      state.currentTime = action.payload.currentTime;

      // Calculate progress
      if (state.duration > 0) {
        state.progressPercentage = (action.payload.currentTime / state.duration) * 100;
      }

      // Update words read
      state.wordsRead = Math.max(state.wordsRead, action.payload.currentWordIndex + 1);
    },

    // Settings
    setPlaybackRate: (state, action: PayloadAction<number>) => {
      state.playbackRate = action.payload;
    },

    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = Math.max(0, Math.min(1, action.payload));
    },

    toggleHighlighting: (state) => {
      state.isHighlightingEnabled = !state.isHighlightingEnabled;
    },

    // Error handling
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.status = 'error';
    },

    clearError: (state) => {
      state.error = null;
    },

    // Session end
    endSession: (state) => {
      state.status = 'ended';
    },

    // Reset
    resetReading: () => initialState,
  },
});

// Export actions
export const {
  initializeSession,
  play,
  pause,
  stop,
  updateProgress,
  setPlaybackRate,
  setVolume,
  toggleHighlighting,
  setError,
  clearError,
  endSession,
  resetReading,
} = readingSlice.actions;

// Selectors
export const selectReading = (state: RootState) => state.reading;
export const selectReadingStatus = (state: RootState) => state.reading.status;
export const selectCurrentWordIndex = (state: RootState) => state.reading.currentWordIndex;
export const selectProgressPercentage = (state: RootState) => state.reading.progressPercentage;
export const selectIsPlaying = (state: RootState) => state.reading.status === 'playing';
export const selectIsPaused = (state: RootState) => state.reading.status === 'paused';

export default readingSlice.reducer;
