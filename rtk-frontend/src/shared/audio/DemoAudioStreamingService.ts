/**
 * Demo Audio Streaming Service
 *
 * Simulates audio streaming for development and testing
 */

import type {
  AudioChunk,
  AudioStreamMetadata,
  AudioBufferState,
  StreamingConfig,
  AudioStreamingService as IAudioStreamingService,
} from './types';

export class DemoAudioStreamingService implements IAudioStreamingService {
  private metadata: AudioStreamMetadata | null = null;
  private chunks = new Map<number, AudioChunk>();
  private loadingChunks = new Set<number>();
  // State is tracked but not needed for demo

  // Event handlers
  private chunkReadyHandlers = new Set<(chunk: AudioChunk) => void>();
  private bufferStateHandlers = new Set<(state: AudioBufferState) => void>();
  private errorHandlers = new Set<(error: Error) => void>();
  private endHandlers = new Set<() => void>();

  // Demo configuration
  private simulateNetworkDelay = true;
  private simulateErrors = false;
  private chunkLoadTime = 200; // ms
  private errorRate = 0.1; // 10% chance of error

  // Analytics
  private lastPlayedChunk = -1;

  async startStream(url: string, _config?: Partial<StreamingConfig>): Promise<AudioStreamMetadata> {
    this.stopStream();

    // Generate demo metadata
    this.metadata = {
      streamId: `demo-stream-${Date.now()}`,
      totalDuration: 120, // 2 minutes
      totalChunks: 24, // 5-second chunks
      chunkDuration: 5,
      format: 'mp3',
      sampleRate: 44100,
      bitrate: 128000,
      channels: 2,
    };

    // Start streaming

    // eslint-disable-next-line no-console
    console.log('[DemoAudioStreaming] Started stream:', url);

    return this.metadata;
  }

  stopStream(): void {
    this.chunks.clear();
    this.loadingChunks.clear();
    this.metadata = null;
    this.lastPlayedChunk = -1;
  }

  pauseStream(): void {
    // eslint-disable-next-line no-console
    console.log('[DemoAudioStreaming] Stream paused');
  }

  resumeStream(): void {
    // eslint-disable-next-line no-console
    console.log('[DemoAudioStreaming] Stream resumed');
  }

  isStreamReady(): boolean {
    return !!this.metadata;
  }

  async getChunk(sequenceNumber: number): Promise<AudioChunk> {
    this.lastPlayedChunk = Math.max(this.lastPlayedChunk, sequenceNumber);

    const existingChunk = this.chunks.get(sequenceNumber);
    if (existingChunk) {
      return existingChunk;
    }

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
            .catch(() => {})
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

    const bufferedChunks: number[] = [];
    let currentChunk = this.lastPlayedChunk + 1;

    while (this.chunks.has(currentChunk) && currentChunk < this.metadata.totalChunks) {
      bufferedChunks.push(currentChunk);
      currentChunk++;
    }

    const bufferedDuration = bufferedChunks.length * this.metadata.chunkDuration;
    const bufferProgress = (this.chunks.size / this.metadata.totalChunks) * 100;

    let bufferHealth: AudioBufferState['bufferHealth'];
    if (bufferedDuration === 0) {
      bufferHealth = 'empty';
    } else if (bufferedDuration < 3) {
      bufferHealth = 'low';
    } else if (bufferedDuration >= 10) {
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
    this.chunks.clear();
    this.loadingChunks.clear();
    this.notifyBufferStateChange();
    // eslint-disable-next-line no-console
    console.log('[DemoAudioStreaming] Buffer cleared');
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

  // Demo control methods
  setSimulateNetworkDelay(enabled: boolean, delayMs: number = 200): void {
    this.simulateNetworkDelay = enabled;
    this.chunkLoadTime = delayMs;
  }

  setSimulateErrors(enabled: boolean, errorRate: number = 0.1): void {
    this.simulateErrors = enabled;
    this.errorRate = errorRate;
  }

  // Private methods
  private async loadChunk(sequenceNumber: number): Promise<AudioChunk> {
    if (!this.metadata) {
      throw new Error('Stream not initialized');
    }

    if (sequenceNumber >= this.metadata.totalChunks) {
      throw new Error('Chunk number exceeds total chunks');
    }

    this.loadingChunks.add(sequenceNumber);
    this.notifyBufferStateChange();

    try {
      // Simulate network delay
      if (this.simulateNetworkDelay) {
        await new Promise(resolve => setTimeout(resolve, this.chunkLoadTime));
      }

      // Simulate random errors
      if (this.simulateErrors && Math.random() < this.errorRate) {
        throw new Error(`Simulated network error loading chunk ${sequenceNumber}`);
      }

      // Generate fake audio data
      const audioData = this.generateFakeAudioData(sequenceNumber);

      const chunk: AudioChunk = {
        id: `demo-chunk-${sequenceNumber}`,
        sequenceNumber,
        startTime: sequenceNumber * this.metadata.chunkDuration,
        duration: this.metadata.chunkDuration,
        size: audioData.byteLength,
        data: audioData,
      };

      this.chunks.set(sequenceNumber, chunk);
      this.loadingChunks.delete(sequenceNumber);

      // eslint-disable-next-line no-console
      console.log(`[DemoAudioStreaming] Loaded chunk ${sequenceNumber}`);

      this.notifyChunkReady(chunk);
      this.notifyBufferStateChange();

      // Check if this was the last chunk
      if (sequenceNumber === this.metadata.totalChunks - 1) {
        setTimeout(() => this.notifyStreamEnd(), 100);
      }

      return chunk;
    } catch (error) {
      this.loadingChunks.delete(sequenceNumber);
      this.notifyBufferStateChange();
      this.notifyError(error as Error);
      throw error;
    }
  }

  private generateFakeAudioData(chunkNumber: number): ArrayBuffer {
    // Generate a simple sine wave for demo purposes
    const sampleRate = this.metadata?.sampleRate || 44100;
    const duration = this.metadata?.chunkDuration || 5;
    const numSamples = sampleRate * duration;
    const buffer = new ArrayBuffer(numSamples * 2); // 16-bit samples
    const view = new Int16Array(buffer);

    // Generate different frequencies for different chunks
    const baseFrequency = 440; // A4
    const frequency = baseFrequency * (1 + chunkNumber * 0.1); // Slightly increase pitch

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * frequency * t) * 0.3;
      view[i] = Math.floor(sample * 32767);
    }

    return buffer;
  }

  private notifyChunkReady(chunk: AudioChunk): void {
    this.chunkReadyHandlers.forEach(handler => {
      try {
        handler(chunk);
      } catch (error) {
        // eslint-disable-next-line no-console
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
        // eslint-disable-next-line no-console
        console.error('Error in buffer state handler:', error);
      }
    });
  }

  private notifyError(error: Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error in error handler:', err);
      }
    });
  }

  private notifyStreamEnd(): void {
    // eslint-disable-next-line no-console
    console.log('[DemoAudioStreaming] Stream ended');
    this.endHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error in end handler:', error);
      }
    });
  }
}
