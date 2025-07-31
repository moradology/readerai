/**
 * Audio Streaming Service
 *
 * Handles HTTP-based audio streaming with intelligent buffering
 */

import type {
  AudioChunk,
  AudioStreamMetadata,
  AudioBufferState,
  StreamingConfig,
  AudioStreamingService as IAudioStreamingService,
} from './types';

const DEFAULT_CONFIG: StreamingConfig = {
  chunkSize: 64 * 1024, // 64KB chunks
  bufferAheadTime: 10, // Buffer 10 seconds ahead
  lowBufferThreshold: 3, // Start aggressive buffering below 3 seconds
  highBufferThreshold: 10, // Stop aggressive buffering at 10 seconds
  reconnectAttempts: 3,
  reconnectDelay: 1000,
};

export class AudioStreamingService implements IAudioStreamingService {
  private config: StreamingConfig;
  private metadata: AudioStreamMetadata | null = null;
  private chunks = new Map<number, AudioChunk>();
  private loadingChunks = new Set<number>();
  private currentStreamUrl: string | null = null;
  private isStreaming = false;
  private isPaused = false;
  private abortController: AbortController | null = null;

  // Event handlers
  private chunkReadyHandlers = new Set<(chunk: AudioChunk) => void>();
  private bufferStateHandlers = new Set<(state: AudioBufferState) => void>();
  private errorHandlers = new Set<(error: Error) => void>();
  private endHandlers = new Set<() => void>();

  // Analytics
  private bytesLoaded = 0;
  private lastPlayedChunk = -1;

  constructor(config?: Partial<StreamingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async startStream(url: string, config?: Partial<StreamingConfig>): Promise<AudioStreamMetadata> {
    if (this.isStreaming) {
      this.stopStream();
    }

    this.config = { ...this.config, ...config };
    this.currentStreamUrl = url;
    this.isStreaming = true;
    this.isPaused = false;
    this.abortController = new AbortController();

    // Fetch metadata
    this.metadata = await this.fetchMetadata(url);

    // Start prefetching initial chunks
    this.prefetchNextChunks();

    return this.metadata;
  }

  stopStream(): void {
    this.isStreaming = false;
    this.abortController?.abort();
    this.abortController = null;
    this.chunks.clear();
    this.loadingChunks.clear();
    this.currentStreamUrl = null;
    this.metadata = null;
    this.bytesLoaded = 0;
    this.lastPlayedChunk = -1;
  }

  pauseStream(): void {
    this.isPaused = true;
  }

  resumeStream(): void {
    if (this.isPaused && this.isStreaming) {
      this.isPaused = false;
      this.prefetchNextChunks();
    }
  }

  isStreamReady(): boolean {
    return !!(this.metadata && this.isStreaming);
  }

  async getChunk(sequenceNumber: number): Promise<AudioChunk> {
    // Update last played chunk for prefetching
    this.lastPlayedChunk = Math.max(this.lastPlayedChunk, sequenceNumber);

    // Return if already loaded
    const existingChunk = this.chunks.get(sequenceNumber);
    if (existingChunk) {
      return existingChunk;
    }

    // Load the chunk
    return this.loadChunk(sequenceNumber);
  }

  async prefetchChunks(startSequence: number, count: number): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let i = 0; i < count; i++) {
      const sequenceNumber = startSequence + i;
      if (!this.chunks.has(sequenceNumber) && !this.loadingChunks.has(sequenceNumber)) {
        promises.push(
          this.loadChunk(sequenceNumber)
            .then(() => {})
            .catch(() => {}) // Ignore errors in prefetch
        );
      }
    }

    await Promise.all(promises);
  }

  getBufferState(): AudioBufferState {
    if (!this.metadata) {
      return {
        bufferedChunks: [],
        bufferedDuration: 0,
        bufferHealth: 'empty',
        isBuffering: false,
        bufferProgress: 0,
      };
    }

    // Find contiguous buffered chunks from last played position
    const bufferedChunks: number[] = [];
    let currentChunk = this.lastPlayedChunk + 1;

    while (this.chunks.has(currentChunk)) {
      bufferedChunks.push(currentChunk);
      currentChunk++;
    }

    const bufferedDuration = bufferedChunks.length * this.metadata.chunkDuration;
    const bufferProgress = (bufferedChunks.length / this.metadata.totalChunks) * 100;

    // Determine buffer health
    let bufferHealth: AudioBufferState['bufferHealth'];
    if (bufferedDuration === 0) {
      bufferHealth = 'empty';
    } else if (bufferedDuration < this.config.lowBufferThreshold) {
      bufferHealth = 'low';
    } else if (bufferedDuration >= this.config.highBufferThreshold) {
      bufferHealth = 'full';
    } else {
      bufferHealth = 'good';
    }

    return {
      bufferedChunks,
      bufferedDuration,
      bufferHealth,
      isBuffering: this.loadingChunks.size > 0,
      bufferProgress,
    };
  }

  clearBuffer(): void {
    // Keep metadata but clear chunks
    this.chunks.clear();
    this.loadingChunks.clear();
    this.bytesLoaded = 0;
    this.notifyBufferStateChange();
  }

  // Event subscriptions
  onChunkReady(callback: (chunk: AudioChunk) => void): () => void {
    this.chunkReadyHandlers.add(callback);
    return () => this.chunkReadyHandlers.delete(callback);
  }

  onBufferStateChange(callback: (state: AudioBufferState) => void): () => void {
    this.bufferStateHandlers.add(callback);
    return () => this.bufferStateHandlers.delete(callback);
  }

  onStreamError(callback: (error: Error) => void): () => void {
    this.errorHandlers.add(callback);
    return () => this.errorHandlers.delete(callback);
  }

  onStreamEnd(callback: () => void): () => void {
    this.endHandlers.add(callback);
    return () => this.endHandlers.delete(callback);
  }

  // Private methods
  private async fetchMetadata(url: string): Promise<AudioStreamMetadata> {
    try {
      const response = await fetch(`${url}/metadata`, {
        ...(this.abortController ? { signal: this.abortController.signal } : {}),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.notifyError(error as Error);
      throw error;
    }
  }

  private async loadChunk(sequenceNumber: number): Promise<AudioChunk> {
    if (!this.metadata || !this.currentStreamUrl) {
      throw new Error('Stream not initialized');
    }

    if (sequenceNumber >= this.metadata.totalChunks) {
      throw new Error('Chunk number exceeds total chunks');
    }

    this.loadingChunks.add(sequenceNumber);
    this.notifyBufferStateChange();

    try {
      const response = await fetch(
        `${this.currentStreamUrl}/chunks/${sequenceNumber}`,
        {
          ...(this.abortController ? { signal: this.abortController.signal } : {}),
          headers: {
            'Range': `bytes=${sequenceNumber * this.config.chunkSize}-${(sequenceNumber + 1) * this.config.chunkSize - 1}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load chunk ${sequenceNumber}: ${response.statusText}`);
      }

      const data = await response.arrayBuffer();
      const chunk: AudioChunk = {
        id: `chunk-${sequenceNumber}`,
        sequenceNumber,
        startTime: sequenceNumber * this.metadata.chunkDuration,
        duration: this.metadata.chunkDuration,
        size: data.byteLength,
        data,
      };

      this.chunks.set(sequenceNumber, chunk);
      this.bytesLoaded += data.byteLength;
      this.loadingChunks.delete(sequenceNumber);

      this.notifyChunkReady(chunk);
      this.notifyBufferStateChange();

      // Trigger more prefetching if needed
      if (!this.isPaused) {
        this.prefetchNextChunks();
      }

      return chunk;
    } catch (error) {
      this.loadingChunks.delete(sequenceNumber);
      this.notifyBufferStateChange();

      if (error instanceof Error && error.name !== 'AbortError') {
        this.notifyError(error);
      }

      throw error;
    }
  }

  private prefetchNextChunks(): void {
    if (!this.metadata || this.isPaused || !this.isStreaming) {
      return;
    }

    const bufferState = this.getBufferState();

    // Determine how aggressive to be with prefetching
    const chunksToLoad = bufferState.bufferHealth === 'low' || bufferState.bufferHealth === 'empty'
      ? 5 // Load more chunks when buffer is low
      : 2; // Normal prefetch rate

    // Find next chunks to load
    const nextChunks: number[] = [];
    let checkChunk = this.lastPlayedChunk + 1;

    while (
      nextChunks.length < chunksToLoad &&
      checkChunk < (this.metadata?.totalChunks || 0)
    ) {
      if (!this.chunks.has(checkChunk) && !this.loadingChunks.has(checkChunk)) {
        nextChunks.push(checkChunk);
      }
      checkChunk++;
    }

    // Load chunks
    nextChunks.forEach(chunkNumber => {
      this.loadChunk(chunkNumber).catch(() => {
        // Errors are handled in loadChunk
      });
    });
  }

  private notifyChunkReady(chunk: AudioChunk): void {
    this.chunkReadyHandlers.forEach(handler => {
      try {
        handler(chunk);
      } catch (error) {
        console.error('Error in chunk ready handler:', error);
      }
    });
  }

  private notifyBufferStateChange(): void {
    const state = this.getBufferState();
    this.bufferStateHandlers.forEach(handler => {
      try {
        handler(state);
      } catch (error) {
        console.error('Error in buffer state handler:', error);
      }
    });
  }

  private notifyError(error: Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        console.error('Error in error handler:', err);
      }
    });
  }
}
