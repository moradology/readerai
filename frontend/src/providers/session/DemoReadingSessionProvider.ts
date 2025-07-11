/**
 * Demo Reading Session Provider
 *
 * Manages reading session state for demo mode
 * Provides mock checkpoints and interruption handling
 */

import type { ReadingSessionProvider, SessionState, SessionProgress } from '../types';

type EventCallback<T> = (arg: T) => void;
type UnsubscribeFn = () => void;

interface DemoCheckpoint {
  id: string;
  wordIndex: number;
  type: 'vocabulary' | 'comprehension';
  question: string;
  options: string[];
  correctAnswer: string;
}

export class DemoReadingSessionProvider implements ReadingSessionProvider {
  readonly name = 'Demo Reading Session';
  readonly version = '1.0.0';
  readonly type = 'demo' as const;

  private ready = false;
  private sessionId: string | null = null;
  private sessionState: SessionState = 'idle';
  private startTime: number = 0;
  private pausedTime: number = 0;
  private currentWordIndex = 0;
  private totalWords = 0;
  private wordsRead = 0;

  // Checkpoints
  private checkpoints = new Map<string, DemoCheckpoint>();
  private triggeredCheckpoints = new Set<string>();

  // Event listeners
  private stateChangeCallbacks = new Set<EventCallback<SessionState>>();
  private checkpointCallbacks = new Set<EventCallback<any>>();
  private progressCallbacks = new Set<EventCallback<SessionProgress>>();

  async initialize(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
    this.ready = true;
    console.log('[DemoReadingSession] Initialized');
  }

  cleanup(): void {
    if (this.sessionState === 'active' || this.sessionState === 'paused') {
      this.endSession('abandoned');
    }
    this.clearAllListeners();
    this.ready = false;
    console.log('[DemoReadingSession] Cleaned up');
  }

  isReady(): boolean {
    return this.ready;
  }

  async startSession(_passageId: string): Promise<string> {
    if (!this.ready) {
      throw new Error('Reading session provider not initialized');
    }

    if (this.sessionState !== 'idle') {
      throw new Error('Session already in progress');
    }

    // Generate session ID
    this.sessionId = `demo-session-${Date.now()}`;
    this.sessionState = 'active';
    this.startTime = Date.now();
    this.currentWordIndex = 0;
    this.wordsRead = 0;

    // Mock total words (would come from passage in real implementation)
    this.totalWords = 150;

    // Generate demo checkpoints
    this.generateDemoCheckpoints();

    // Notify state change
    this.notifyStateChange('active');

    console.log('[DemoReadingSession] Started session:', this.sessionId);
    return this.sessionId;
  }

  pauseSession(): void {
    if (this.sessionState !== 'active') {
      return;
    }

    this.sessionState = 'paused';
    this.pausedTime = Date.now();
    this.notifyStateChange('paused');
    console.log('[DemoReadingSession] Paused');
  }

  resumeSession(): void {
    if (this.sessionState !== 'paused') {
      return;
    }

    this.sessionState = 'active';
    // Adjust start time to account for pause duration
    if (this.pausedTime > 0) {
      this.startTime += Date.now() - this.pausedTime;
      this.pausedTime = 0;
    }

    this.notifyStateChange('active');
    console.log('[DemoReadingSession] Resumed');
  }

  async endSession(reason: 'completed' | 'abandoned'): Promise<void> {
    if (this.sessionState === 'idle') {
      return;
    }

    this.sessionState = reason === 'completed' ? 'completed' : 'abandoned';
    this.notifyStateChange(this.sessionState);

    // Clear session data
    this.sessionId = null;
    this.checkpoints.clear();
    this.triggeredCheckpoints.clear();

    console.log('[DemoReadingSession] Ended:', reason);
  }

  updateProgress(wordIndex: number, _audioTime: number): void {
    if (this.sessionState !== 'active') {
      return;
    }

    this.currentWordIndex = wordIndex;
    this.wordsRead = Math.max(this.wordsRead, wordIndex + 1);

    // Check for checkpoints at this position
    this.checkForCheckpoints(wordIndex);

    // Calculate and notify progress
    const progress = this.calculateProgress();
    this.progressCallbacks.forEach(cb => cb(progress));
  }

  getCurrentWordIndex(): number {
    return this.currentWordIndex;
  }

  getWordsPerMinute(): number {
    if (this.sessionState === 'idle' || this.wordsRead === 0) {
      return 0;
    }

    const elapsedMinutes = this.getElapsedTime() / 60000;
    return Math.round(this.wordsRead / elapsedMinutes);
  }

  registerCheckpoint(wordIndex: number, checkpoint: any): void {
    const id = `checkpoint-${wordIndex}`;
    this.checkpoints.set(id, {
      id,
      wordIndex,
      ...checkpoint,
    });
    console.log('[DemoReadingSession] Registered checkpoint at word', wordIndex);
  }

  triggerCheckpoint(checkpointId: string): void {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint || this.triggeredCheckpoints.has(checkpointId)) {
      return;
    }

    this.triggeredCheckpoints.add(checkpointId);
    this.checkpointCallbacks.forEach(cb => cb(checkpoint));
    console.log('[DemoReadingSession] Triggered checkpoint:', checkpointId);
  }

  async submitCheckpointAnswer(checkpointId: string, answer: string): Promise<boolean> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      throw new Error('Checkpoint not found');
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const isCorrect = answer === checkpoint.correctAnswer;
    console.log('[DemoReadingSession] Answer submitted:', { checkpointId, answer, isCorrect });

    return isCorrect;
  }

  async createInterruption(type: string, context: string): Promise<void> {
    if (this.sessionState !== 'active') {
      throw new Error('No active session');
    }

    // Pause the session during interruption
    this.pauseSession();

    console.log('[DemoReadingSession] Interruption created:', { type, context });

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  async getInterruptionResponse(): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return mock response
    return "That's a great question! The word 'curious' means wanting to know or learn something new. Tommy the turtle was curious because he wanted to explore beyond his pond.";
  }

  onSessionStateChange(callback: EventCallback<SessionState>): UnsubscribeFn {
    this.stateChangeCallbacks.add(callback);
    return () => this.stateChangeCallbacks.delete(callback);
  }

  onCheckpoint(callback: EventCallback<any>): UnsubscribeFn {
    this.checkpointCallbacks.add(callback);
    return () => this.checkpointCallbacks.delete(callback);
  }

  onProgressUpdate(callback: EventCallback<SessionProgress>): UnsubscribeFn {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  private generateDemoCheckpoints(): void {
    // Add some demo checkpoints at specific word positions
    this.registerCheckpoint(30, {
      type: 'vocabulary',
      question: "What does 'peaceful' mean?",
      options: [
        'Loud and noisy',
        'Calm and quiet',
        'Scary and dark',
        'Bright and sunny'
      ],
      correctAnswer: 'Calm and quiet',
    });

    this.registerCheckpoint(75, {
      type: 'comprehension',
      question: 'Where does Tommy live?',
      options: [
        'In the ocean',
        'In a peaceful pond',
        'In a river',
        'In a lake'
      ],
      correctAnswer: 'In a peaceful pond',
    });
  }

  private checkForCheckpoints(wordIndex: number): void {
    this.checkpoints.forEach((checkpoint, id) => {
      if (checkpoint.wordIndex === wordIndex && !this.triggeredCheckpoints.has(id)) {
        this.triggerCheckpoint(id);
      }
    });
  }

  private calculateProgress(): SessionProgress {
    const percentComplete = (this.wordsRead / this.totalWords) * 100;
    const timeElapsed = this.getElapsedTime() / 1000; // Convert to seconds
    const wordsPerMinute = this.getWordsPerMinute();

    return {
      wordIndex: this.currentWordIndex,
      wordsRead: this.wordsRead,
      totalWords: this.totalWords,
      percentComplete,
      timeElapsed,
      wordsPerMinute,
    };
  }

  private getElapsedTime(): number {
    if (this.sessionState === 'idle') {
      return 0;
    }

    const now = this.sessionState === 'paused' ? this.pausedTime : Date.now();
    return now - this.startTime;
  }

  private notifyStateChange(state: SessionState): void {
    this.stateChangeCallbacks.forEach(cb => cb(state as any));
  }

  private clearAllListeners(): void {
    this.stateChangeCallbacks.clear();
    this.checkpointCallbacks.clear();
    this.progressCallbacks.clear();
  }
}

// Singleton instance
let instance: DemoReadingSessionProvider | null = null;

export function getDemoReadingSessionProvider(): DemoReadingSessionProvider {
  if (!instance) {
    instance = new DemoReadingSessionProvider();
  }
  return instance;
}
