// Unified Reading Session Manager that coordinates WebSocket, Audio, and API

import { getWebSocketService, WebSocketService } from './websocket';
import { createAudioStreamer, AudioStreamingService, AudioStreamState } from './audioStreaming';
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
    // Connect WebSocket
    this.ws.connect();

    // Set up WebSocket message handlers
    this.unsubscribers.push(
      this.ws.on('reading_start', this.handleReadingStart.bind(this)),
      this.ws.on('checkpoint', this.handleCheckpointMessage.bind(this)),
      this.ws.on('interruption_response', this.handleInterruptionResponse.bind(this)),
      this.ws.on('error', this.handleWebSocketError.bind(this))
    );

    // Request initial passage
    const result = await readerApi.getInitialPassage();
    if (isApiError(result)) {
      throw new Error(result.error.message);
    }

    // Update state with passage
    this.updateState({
      passage: result.data.passage,
    });

    // Send initial passage to WebSocket
    this.ws.send({
      type: 'initialize',
      passage: result.data.passage,
    });
  }

  async startReading(): Promise<void> {
    if (this.state.readingState !== 'idle' && this.state.readingState !== 'paused') {
      return;
    }

    this.updateState({ readingState: 'loading' });

    // Request audio stream info from server
    this.ws.send({
      type: 'start_reading',
      position: this.state.currentWordIndex,
    });
  }

  pauseReading(): void {
    if (this.state.readingState !== 'reading') {
      return;
    }

    this.audio.pause();
    this.updateState({ readingState: 'paused' });

    this.ws.send({
      type: 'pause_reading',
      position: this.state.currentWordIndex,
      audioTime: this.state.currentAudioTime,
    });
  }

  async resumeReading(): Promise<void> {
    if (this.state.readingState !== 'paused') {
      return;
    }

    await this.audio.play();
    this.updateState({ readingState: 'reading' });

    this.ws.send({
      type: 'resume_reading',
      position: this.state.currentWordIndex,
    });
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

    this.ws.send({
      type: 'interruption',
      interruptionType: interruption.type,
      timestamp: interruption.timestamp,
      wordIndex: interruption.wordIndex,
      context: interruption.context,
      userInput: interruption.userInput,
    });
  }

  async submitCheckpointAnswer(answer: string): Promise<void> {
    if (this.state.readingState !== 'checkpoint') {
      return;
    }

    const currentCheckpoint = this.getCurrentCheckpoint();
    if (!currentCheckpoint || !this.state.sessionId) {
      return;
    }

    this.ws.send({
      type: 'checkpoint_answer',
      checkpointId: currentCheckpoint.position.toString(),
      answer,
    });
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
    this.handleError(new Error(message.error || 'WebSocket error'));
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
    this.audio.cleanup();
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];

    if (this.state.sessionId) {
      readerApi.saveSession(this.state.sessionId);
    }
  }
}
