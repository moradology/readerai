/**
 * Audio Streaming Types
 *
 * Defines interfaces for audio streaming, buffering, and playback
 */

import type { WordTiming } from '@features/reading/api/types';

// Re-export for convenience
export type { WordTiming };

/**
 * Audio chunk metadata
 */
export interface AudioChunk {
  id: string;
  sequenceNumber: number;
  startTime: number; // Start time in seconds
  duration: number; // Duration in seconds
  size: number; // Size in bytes
  data: ArrayBuffer;
}

/**
 * Audio stream metadata
 */
export interface AudioStreamMetadata {
  streamId: string;
  totalDuration: number;
  totalChunks: number;
  chunkDuration: number; // Target duration per chunk
  format: 'mp3' | 'wav' | 'ogg' | 'webm';
  sampleRate: number;
  bitrate: number;
  channels: number;
}

/**
 * Audio buffer state
 */
export interface AudioBufferState {
  bufferedChunks: number[];
  bufferedDuration: number;
  bufferHealth: 'empty' | 'low' | 'good' | 'full';
  isBuffering: boolean;
  bufferProgress: number; // 0-100
}

/**
 * Streaming configuration
 */
export interface StreamingConfig {
  chunkSize: number; // Target chunk size in bytes
  bufferAheadTime: number; // How many seconds to buffer ahead
  lowBufferThreshold: number; // When to start buffering more aggressively
  highBufferThreshold: number; // When to stop aggressive buffering
  reconnectAttempts: number;
  reconnectDelay: number;
}

/**
 * Audio streaming service interface
 */
export interface AudioStreamingService {
  // Stream management
  startStream(url: string, config?: Partial<StreamingConfig>): Promise<AudioStreamMetadata>;
  stopStream(): void;
  pauseStream(): void;
  resumeStream(): void;
  isStreamReady(): boolean;

  // Chunk access
  getChunk(sequenceNumber: number): Promise<AudioChunk>;
  prefetchChunks(startSequence: number, count: number): Promise<void>;

  // Buffer management
  getBufferState(): AudioBufferState;
  clearBuffer(): void;

  // Events
  onChunkReady(callback: (chunk: AudioChunk) => void): () => void;
  onBufferStateChange(callback: (state: AudioBufferState) => void): () => void;
  onStreamError(callback: (error: Error) => void): () => void;
  onStreamEnd(callback: () => void): () => void;
}

/**
 * Enhanced audio player interface for streaming
 */
export interface StreamingAudioPlayer {
  // Streaming operations
  loadStream(streamService: AudioStreamingService, metadata: AudioStreamMetadata): Promise<void>;

  // Playback with buffering awareness
  playWhenReady(): Promise<void>;
  canPlayThrough(): boolean;

  // Seek with chunk loading
  seekToChunk(chunkNumber: number): Promise<void>;
  seekToTime(time: number): Promise<void>;

  // Buffer monitoring
  getBufferTimeRanges(): TimeRanges;
  getBufferedEnd(): number;
  getBufferedStart(): number;

  // Word timing sync
  getCurrentWordIndex(wordTimings: WordTiming[]): number;
  syncToWord(wordIndex: number, wordTimings: WordTiming[]): void;
}

/**
 * Audio analytics for monitoring streaming performance
 */
export interface AudioStreamAnalytics {
  startTime: number;
  bytesLoaded: number;
  chunksLoaded: number;
  chunksPlayed: number;
  bufferUnderruns: number;
  averageBufferHealth: number;
  networkErrors: number;
  playbackStalls: number;
}

/**
 * Events emitted by the streaming system
 */
export interface AudioStreamEvents {
  'stream:start': { metadata: AudioStreamMetadata };
  'stream:end': void;
  'stream:error': { error: Error };
  'chunk:loaded': { chunk: AudioChunk };
  'chunk:failed': { sequenceNumber: number; error: Error };
  'buffer:low': { bufferedDuration: number };
  'buffer:recovered': { bufferedDuration: number };
  'playback:stalled': { position: number };
  'playback:resumed': { position: number };
}
