// Unified Reading Session Manager that coordinates WebSocket, Audio, and API

import { getWebSocketService, WebSocketService } from '../../../shared/services/websocket';
import { createAudioStreamer, AudioStreamingService, AudioStreamState } from '../../../shared/services/audioStreaming';
import { readerApi, isApiError, WordTiming } from './api';

export type ReadingState = 'idle' | 'loading' | 'reading' | 'paused' | 'interrupted' | 'checkpoint' | 'ended';

export type InterruptionType = 'word_meaning' | 'clarification' | 'repeat' | 'question';

export interface ComprehensionCheckpoint {
  position: number;
  type: 'vocabulary' | 'comprehension' | 'prediction';
  question: string;
  userAnswer?: string;
  isCorrect?: boolean;
  timestamp: string;
}

export interface ReadingSessionState {
  sessionId: string | null;
  passage: string;
  currentWordIndex: number;
  currentAudioTime: number;
  readingState: ReadingState;
  wordTimings: WordTiming[];
  comprehensionCheckpoints: ComprehensionCheckpoint[];
  pendingInterruption: Interruption | null;
  audioStreamUrl: string | null;
}

export interface Interruption {
  type: InterruptionType;
  timestamp: number;
  wordIndex: number;
  context: string;
  userInput?: string;
}

export interface ReadingSessionConfig {
  onStateChange?: (state: ReadingSessionState) => void;
  onWordHighlight?: (wordIndex: number) => void;
  onCheckpoint?: (checkpoint: ComprehensionCheckpoint) => void;
  onError?: (error: Error) => void;
}

export class ReadingSessionManager {
  private ws: WebSocketService;
  private audio: AudioStreamingService;
  private state: ReadingSessionState;
  private config: ReadingSessionConfig;
  private unsubscribers: Array<() => void> = [];
  private syncInterval: number | null = null;
  private mockWordInterval: number | null = null;

  constructor(config: ReadingSessionConfig = {}) {
    this.config = config;
    this.ws = getWebSocketService();
    this.audio = createAudioStreamer({
      onProgress: this.handleAudioProgress.bind(this),
      onStateChange: this.handleAudioStateChange.bind(this),
      onError: this.handleError.bind(this),
    });

    this.state = {
      sessionId: null,
      passage: '',
      currentWordIndex: -1,
      currentAudioTime: 0,
      readingState: 'idle',
      wordTimings: [],
      comprehensionCheckpoints: [],
      pendingInterruption: null,
      audioStreamUrl: null,
    };
  }

  async initialize(): Promise<void> {
    // Connect WebSocket - but don't fail if it doesn't work
    try {
      console.log('Connecting WebSocket...');
      this.ws.connect();

      // Set up WebSocket message handlers
      console.log('Setting up WebSocket handlers...');
      this.unsubscribers.push(
        this.ws.on('reading_start', this.handleReadingStart.bind(this)),
        this.ws.on('checkpoint', this.handleCheckpointMessage.bind(this)),
        this.ws.on('interruption_response', this.handleInterruptionResponse.bind(this)),
        this.ws.on('error', this.handleWebSocketError.bind(this))
      );
      console.log('WebSocket handlers set up');
    } catch (error) {
      console.warn('WebSocket connection failed, running in demo mode', error);
    }

    // Request initial passage
    console.log('Fetching initial passage...');
    const result = await readerApi.getInitialPassage();
    console.log('API Result:', result);
    if (isApiError(result)) {
      console.error('API Error:', result.error);
      throw new Error(result.error.message);
    }

    // Update state with passage
    this.updateState({
      passage: result.data.passage,
    });

    // Try to send initial passage to WebSocket
    // Disabled for now - backend uses old protocol
    /*
    try {
      this.ws.send({
        type: 'initialize',
        passage: result.data.passage,
      });
    } catch (error) {
      console.warn('Failed to send WebSocket message', error);
    }
    */
  }

  async startReading(): Promise<void> {
    if (this.state.readingState !== 'idle' && this.state.readingState !== 'paused') {
      return;
    }

    this.updateState({ readingState: 'loading' });

    // DEMO MODE: Since we don't have real audio/WebSocket, simulate reading
    console.warn('Demo mode: Simulating reading without real audio');

    // Create mock word timings
    const words = this.state.passage.split(/\s+/);
    const mockTimings: WordTiming[] = words.map((word, index) => ({
      word,
      startTime: index * 0.3, // 300ms per word
      endTime: (index + 1) * 0.3,
      wordIndex: index,
    }));

    this.updateState({
      sessionId: 'demo-session',
      wordTimings: mockTimings,
      readingState: 'reading',
    });

    // Start mock word highlighting
    this.startMockReading();

    // Try WebSocket (but don't fail)
    try {
      this.ws.send({
        type: 'start_reading',
        position: this.state.currentWordIndex,
      });
    } catch (error) {
      console.warn('WebSocket not available', error);
    }
  }

  private startMockReading(): void {
    this.stopMockReading();

    // Simulate word-by-word reading
    this.mockWordInterval = window.setInterval(() => {
      if (this.state.readingState !== 'reading') {
        this.stopMockReading();
        return;
      }

      const nextIndex = this.state.currentWordIndex + 1;
      if (nextIndex >= this.state.wordTimings.length) {
        this.updateState({ readingState: 'ended' });
        this.stopMockReading();
        return;
      }

      this.updateState({
        currentWordIndex: nextIndex,
        currentAudioTime: this.state.wordTimings[nextIndex].startTime
      });
      this.config.onWordHighlight?.(nextIndex);

      // Demo: Add a checkpoint after 20 words
      if (nextIndex === 20 && this.state.comprehensionCheckpoints.length === 0) {
        this.handleCheckpointMessage({
          checkpoint: {
            position: 20,
            type: 'vocabulary',
            question: 'What does the challenging word in this passage mean?',
            timestamp: new Date().toISOString(),
          }
        });
      }
    }, 300); // 300ms per word
  }

  private stopMockReading(): void {
    if (this.mockWordInterval !== null) {
      clearInterval(this.mockWordInterval);
      this.mockWordInterval = null;
    }
  }

  pauseReading(): void {
    if (this.state.readingState !== 'reading') {
      return;
    }

    this.stopMockReading();
    this.audio.pause();
    this.updateState({ readingState: 'paused' });

    try {
      this.ws.send({
        type: 'pause_reading',
        position: this.state.currentWordIndex,
        audioTime: this.state.currentAudioTime,
      });
    } catch (error) {
      console.warn('WebSocket not available', error);
    }
  }

  async resumeReading(): Promise<void> {
    if (this.state.readingState !== 'paused') {
      return;
    }

    this.updateState({ readingState: 'reading' });
    this.startMockReading(); // Resume mock reading

    try {
      await this.audio.play();
    } catch (error) {
      console.warn('Audio not available', error);
    }

    try {
      this.ws.send({
        type: 'resume_reading',
        position: this.state.currentWordIndex,
      });
    } catch (error) {
      console.warn('WebSocket not available', error);
    }
  }

  interrupt(type: InterruptionType, userInput?: string): void {
    // Pause if reading
    if (this.state.readingState === 'reading') {
      this.pauseReading();
    }

    const interruption: Interruption = {
      type,
      timestamp: Date.now(),
      wordIndex: this.state.currentWordIndex,
      context: this.getContextWindow(),
      userInput,
    };

    this.updateState({
      readingState: 'interrupted',
      pendingInterruption: interruption,
    });

    // Demo: Simulate response after 1 second
    setTimeout(() => {
      this.handleInterruptionResponse({
        response: `Demo response: I understand you have a question about ${type}. In a real implementation, this would provide helpful information about "${interruption.context}"`,
      });
    }, 1000);

    try {
      this.ws.send({
        type: 'interruption',
        interruptionType: interruption.type,
        timestamp: interruption.timestamp,
        wordIndex: interruption.wordIndex,
        context: interruption.context,
        userInput: interruption.userInput,
      });
    } catch (error) {
      console.warn('WebSocket not available', error);
    }
  }

  async submitCheckpointAnswer(answer: string): Promise<void> {
    if (this.state.readingState !== 'checkpoint') {
      return;
    }

    const currentCheckpoint = this.getCurrentCheckpoint();
    if (!currentCheckpoint || !this.state.sessionId) {
      return;
    }

    // Demo: Mark as correct and resume
    setTimeout(() => {
      this.updateState({ readingState: 'paused' });
    }, 500);

    try {
      this.ws.send({
        type: 'checkpoint_answer',
        checkpointId: currentCheckpoint.position.toString(),
        answer,
      });
    } catch (error) {
      console.warn('WebSocket not available', error);
    }
  }

  seekToWord(wordIndex: number): void {
    if (wordIndex < 0 || wordIndex >= this.state.wordTimings.length) {
      return;
    }

    const timing = this.state.wordTimings[wordIndex];
    this.audio.seek(timing.startTime);
    this.updateState({ currentWordIndex: wordIndex });
  }

  setPlaybackSpeed(speed: number): void {
    this.audio.setPlaybackRate(speed);
  }

  // Private methods

  private handleReadingStart(message: any): void {
    const { sessionId, audioUrl, wordTimings } = message;

    this.updateState({
      sessionId,
      audioStreamUrl: audioUrl,
      wordTimings,
    });

    // Start audio streaming
    this.audio.startStream(audioUrl).then(() => {
      this.audio.play();
      this.startSyncTimer();
    });
  }

  private handleCheckpointMessage(message: any): void {
    const checkpoint: ComprehensionCheckpoint = message.checkpoint;

    // Pause reading
    this.pauseReading();

    // Update state
    this.updateState({
      readingState: 'checkpoint',
      comprehensionCheckpoints: [...this.state.comprehensionCheckpoints, checkpoint],
    });

    // Notify listener
    this.config.onCheckpoint?.(checkpoint);
  }

  private handleInterruptionResponse(_message: any): void {
    // Handle the response and potentially resume reading
    this.updateState({
      readingState: 'paused',
      pendingInterruption: null,
    });
  }

  private handleWebSocketError(message: any): void {
    console.error('WebSocket error message received:', message);
    // Don't fail initialization for WebSocket errors - just log them
    // this.handleError(new Error(message.error || 'WebSocket error'));
    console.warn('Ignoring WebSocket error during demo mode');
  }

  private handleAudioProgress(currentTime: number): void {
    this.updateState({ currentAudioTime: currentTime });

    // Find current word based on audio time
    const wordIndex = this.findWordIndexByTime(currentTime);
    if (wordIndex !== this.state.currentWordIndex) {
      this.updateState({ currentWordIndex: wordIndex });
      this.config.onWordHighlight?.(wordIndex);
    }

    // Check for upcoming checkpoints
    this.checkForUpcomingCheckpoint(wordIndex);
  }

  private handleAudioStateChange(state: AudioStreamState): void {
    switch (state) {
      case 'playing':
        this.updateState({ readingState: 'reading' });
        break;
      case 'paused':
        if (this.state.readingState === 'reading') {
          this.updateState({ readingState: 'paused' });
        }
        break;
      case 'ended':
        this.updateState({ readingState: 'ended' });
        this.stopSyncTimer();
        break;
      case 'error':
        this.updateState({ readingState: 'idle' });
        this.stopSyncTimer();
        break;
    }
  }

  private handleError(error: Error): void {
    console.error('Reading session error:', error);
    this.config.onError?.(error);
    this.updateState({ readingState: 'idle' });
  }

  private findWordIndexByTime(time: number): number {
    if (!this.state.wordTimings.length) return -1;

    for (let i = 0; i < this.state.wordTimings.length; i++) {
      const timing = this.state.wordTimings[i];
      if (time >= timing.startTime && time < timing.endTime) {
        return i;
      }
    }

    return this.state.wordTimings.length - 1;
  }

  private getContextWindow(wordsBefore = 10, wordsAfter = 10): string {
    const words = this.state.passage.split(/\s+/);
    const currentIndex = Math.max(0, this.state.currentWordIndex);

    const start = Math.max(0, currentIndex - wordsBefore);
    const end = Math.min(words.length, currentIndex + wordsAfter + 1);

    return words.slice(start, end).join(' ');
  }

  private getCurrentCheckpoint(): ComprehensionCheckpoint | null {
    return this.state.comprehensionCheckpoints[this.state.comprehensionCheckpoints.length - 1] || null;
  }

  private checkForUpcomingCheckpoint(_wordIndex: number): void {
    // This would check if we're approaching a checkpoint position
    // and prepare for it (e.g., slow down, prepare UI)
  }

  private startSyncTimer(): void {
    this.stopSyncTimer();

    // Sync position with server periodically
    this.syncInterval = window.setInterval(() => {
      if (this.state.readingState === 'reading' && this.state.sessionId) {
        readerApi.updateProgress(this.state.sessionId, this.state.currentWordIndex);
      }
    }, 5000); // Every 5 seconds
  }

  private stopSyncTimer(): void {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private updateState(updates: Partial<ReadingSessionState>): void {
    this.state = { ...this.state, ...updates };
    this.config.onStateChange?.(this.state);
  }

  cleanup(): void {
    this.stopSyncTimer();
    this.stopMockReading();
    this.audio.cleanup();
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];

    if (this.state.sessionId) {
      readerApi.saveSession(this.state.sessionId);
    }
  }
}
