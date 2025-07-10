/**
 * Provider System Type Definitions
 *
 * Defines interfaces for all swappable provider implementations
 * Allows switching between demo, real, and offline implementations
 */

import type { WordTiming } from '@features/reading/api/types';

/**
 * Base provider interface that all providers must implement
 */
export interface BaseProvider {
  readonly name: string;
  readonly version: string;
  readonly type: 'demo' | 'real' | 'offline';
  initialize(): Promise<void>;
  cleanup(): void;
  isReady(): boolean;
}

/**
 * Text-to-Speech Provider Interface
 */
export interface TTSProvider extends BaseProvider {
  // Generate speech from text
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;

  // Get available voices
  getVoices(): Promise<TTSVoice[]>;

  // Preload a passage for faster playback
  preload(text: string, options?: TTSOptions): Promise<void>;

  // Cancel ongoing synthesis
  cancel(): void;
}

export interface TTSOptions {
  voice?: string;
  rate?: number; // 0.1 to 10
  pitch?: number; // 0 to 2
  volume?: number; // 0 to 1
  language?: string;
}

export interface TTSResult {
  audioUrl: string;
  duration: number;
  wordTimings: WordTiming[];
  format: 'mp3' | 'wav' | 'ogg';
}

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  premium: boolean;
}

/**
 * Audio Player Provider Interface
 */
export interface AudioPlayerProvider extends BaseProvider {
  // Load audio from URL
  load(url: string): Promise<void>;

  // Playback controls
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  seek(time: number): void;

  // State getters
  getCurrentTime(): number;
  getDuration(): number;
  getPlaybackRate(): number;
  getVolume(): number;
  isPlaying(): boolean;
  isLoaded(): boolean;

  // State setters
  setPlaybackRate(rate: number): void;
  setVolume(volume: number): void;

  // Event subscriptions
  onTimeUpdate(callback: (time: number) => void): () => void;
  onEnded(callback: () => void): () => void;
  onError(callback: (error: Error) => void): () => void;
  onLoadStart(callback: () => void): () => void;
  onLoadComplete(callback: () => void): () => void;
}

/**
 * Reading Session Provider Interface
 * Manages reading session state and synchronization
 */
export interface ReadingSessionProvider extends BaseProvider {
  // Session management
  startSession(passageId: string): Promise<string>; // Returns sessionId
  pauseSession(): void;
  resumeSession(): void;
  endSession(reason: 'completed' | 'abandoned'): Promise<void>;

  // Progress tracking
  updateProgress(wordIndex: number, audioTime: number): void;
  getCurrentWordIndex(): number;
  getWordsPerMinute(): number;

  // Checkpoint handling
  registerCheckpoint(wordIndex: number, checkpoint: any): void;
  triggerCheckpoint(checkpointId: string): void;
  submitCheckpointAnswer(checkpointId: string, answer: string): Promise<boolean>;

  // Interruption handling
  createInterruption(type: string, context: string): Promise<void>;
  getInterruptionResponse(): Promise<string>;

  // State subscriptions
  onSessionStateChange(callback: (state: SessionState) => void): () => void;
  onCheckpoint(callback: (checkpoint: any) => void): () => void;
  onProgressUpdate(callback: (progress: SessionProgress) => void): () => void;
}

export type SessionState = 'idle' | 'active' | 'paused' | 'completed' | 'abandoned';

export interface SessionProgress {
  wordIndex: number;
  wordsRead: number;
  totalWords: number;
  percentComplete: number;
  timeElapsed: number;
  wordsPerMinute: number;
}

/**
 * Analytics Provider Interface
 */
export interface AnalyticsProvider extends BaseProvider {
  // Track events
  trackEvent(eventName: string, properties?: Record<string, any>): void;

  // Track page views
  trackPageView(pageName: string, properties?: Record<string, any>): void;

  // Track timing
  trackTiming(category: string, variable: string, time: number): void;

  // User identification
  identify(userId: string, traits?: Record<string, any>): void;

  // Session tracking
  startSession(): void;
  endSession(): void;
}

/**
 * Provider Registry Interface
 */
export interface ProviderRegistry {
  register<T extends BaseProvider>(type: string, provider: T): void;
  get<T extends BaseProvider>(type: string): T;
  getAll(): Map<string, BaseProvider>;
  has(type: string): boolean;
  unregister(type: string): void;
  initializeAll(): Promise<void>;
  cleanupAll(): void;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  type: 'demo' | 'real' | 'offline';
  options?: Record<string, any>;
}

export interface ProvidersConfig {
  tts: ProviderConfig;
  audioPlayer: ProviderConfig;
  readingSession: ProviderConfig;
  analytics: ProviderConfig;
  websocket?: ProviderConfig;
}

/**
 * WebSocket Message Types
 */
export interface WebSocketMessage<T = any> {
  type: string;
  payload?: T;
  id?: string;
  timestamp?: number;
}

export interface WebSocketError {
  code: string;
  message: string;
  details?: any;
}

/**
 * WebSocket Connection States
 */
export type WebSocketState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * WebSocket Provider Interface
 * Manages real-time bidirectional communication
 */
export interface WebSocketProvider extends BaseProvider {
  // Connection management
  connect(): Promise<void>;
  disconnect(): void;

  // Message handling
  send<T = any>(message: WebSocketMessage<T>): void;
  sendAndWait<T = any, R = any>(message: WebSocketMessage<T>, timeoutMs?: number): Promise<R>;

  // State
  getState(): WebSocketState;
  isConnected(): boolean;

  // Event subscriptions
  on(event: 'message', handler: (message: WebSocketMessage) => void): () => void;
  on(event: 'state', handler: (state: WebSocketState) => void): () => void;
  on(event: 'error', handler: (error: WebSocketError) => void): () => void;
  on(event: string, handler: (data: any) => void): () => void;

  // Typed message handlers
  onMessage<T = any>(type: string, handler: (payload: T) => void): () => void;
}

/**
 * WebSocket Configuration
 */
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnect?: boolean;
  reconnectInterval?: number;
  reconnectMaxRetries?: number;
  heartbeatInterval?: number;
  messageTimeout?: number;
}
