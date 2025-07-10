/**
 * Real Audio Demo Service
 *
 * Uses actual MP3 audio file for realistic streaming demo
 */

import type {
  AudioChunk,
  AudioStreamMetadata,
  AudioBufferState,
  StreamingConfig,
  AudioStreamingService as IAudioStreamingService,
} from './types';
import { generateDemoAudio } from './generateDemoAudio';

export class RealAudioDemoService implements IAudioStreamingService {
  private metadata: AudioStreamMetadata | null = null;
  private chunks = new Map<number, AudioChunk>();
  private loadingChunks = new Set<number>();
  private audioBuffer: ArrayBuffer | null = null;
  private audioUrl = '/demo_transcription/a.wav'; // Demo WAV file
  private audioFormat: 'mp3' | 'wav' = 'wav';

  // Event handlers
  private chunkReadyHandlers = new Set<(chunk: AudioChunk) => void>();
  private bufferStateHandlers = new Set<(state: AudioBufferState) => void>();
  private errorHandlers = new Set<(error: Error) => void>();
  private endHandlers = new Set<() => void>();

  // Demo configuration
  private simulateNetworkDelay = true;
  private chunkLoadTime = 100; // ms
  private chunkDuration = 5; // seconds per chunk

  // Analytics
  private lastPlayedChunk = -1;

  async startStream(_url: string, _config?: Partial<StreamingConfig>): Promise<AudioStreamMetadata> {
    this.stopStream();

    try {
      // Load the entire audio file (for demo purposes)
      // In production, we'd only load chunks as needed
      console.log('[RealAudioDemo] Loading audio file...');

      // Load the WAV file from demo_transcription
      try {
        console.log('[RealAudioDemo] Loading WAV file from:', this.audioUrl);
        const response = await fetch(this.audioUrl);
        if (!response.ok) {
          throw new Error(`Failed to load audio file: ${response.status} ${response.statusText}`);
        }

        this.audioBuffer = await response.arrayBuffer();
        this.audioFormat = 'wav';
        console.log('[RealAudioDemo] Successfully loaded WAV file, size:', this.audioBuffer.byteLength);
      } catch (error) {
        console.error('[RealAudioDemo] Failed to load WAV file:', error);
        // Fallback to generated audio
        console.log('[RealAudioDemo] Using generated WAV audio as fallback');
        const blob = await generateDemoAudio();
        this.audioBuffer = await blob.arrayBuffer();
        this.audioFormat = 'wav';
      }
      if (!this.audioBuffer) {
        throw new Error('Failed to load audio buffer');
      }

      const audioSize = this.audioBuffer.byteLength;

      // Calculate duration from WAV header for proper timing
      let duration = 60; // Default fallback

      if (this.audioFormat === 'wav' && audioSize > 44) {
        try {
          // Read WAV header to get actual duration
          const view = new DataView(this.audioBuffer);
          const sampleRate = view.getUint32(24, true); // Sample rate at offset 24
          const channels = view.getUint16(22, true); // Number of channels
          const bitsPerSample = view.getUint16(34, true); // Bits per sample at offset 34

          // Find the data chunk (it might not be at a fixed position)
          let dataSize = 0;
          let offset = 12; // Start after "RIFF" header

          while (offset < audioSize - 8) {
            const chunkId = String.fromCharCode(
              view.getUint8(offset),
              view.getUint8(offset + 1),
              view.getUint8(offset + 2),
              view.getUint8(offset + 3)
            );
            const chunkSize = view.getUint32(offset + 4, true);

            if (chunkId === 'data') {
              dataSize = chunkSize;
              break;
            }

            offset += 8 + chunkSize;
            // Align to word boundary
            if (chunkSize % 2 !== 0) offset++;
          }

          if (dataSize > 0 && sampleRate > 0 && channels > 0 && bitsPerSample > 0) {
            const bytesPerSample = bitsPerSample / 8;
            const totalSamples = dataSize / (bytesPerSample * channels);
            duration = totalSamples / sampleRate;
            console.log('[RealAudioDemo] WAV duration calculated:', duration, 'seconds');
          } else {
            console.warn('[RealAudioDemo] Invalid WAV header, using fallback duration');
          }
        } catch (error) {
          console.error('[RealAudioDemo] Error parsing WAV header:', error);
          // Keep default fallback duration
        }
      }

      const bytesPerSecond = audioSize / duration;
      const chunkSize = Math.max(1024, Math.floor(bytesPerSecond * this.chunkDuration)); // Minimum 1KB chunks
      const totalChunks = Math.max(1, Math.ceil(audioSize / chunkSize));

      // Validate values
      if (!isFinite(totalChunks) || totalChunks > 10000) {
        throw new Error('Invalid audio metadata calculated');
      }

      this.metadata = {
        streamId: `real-demo-${Date.now()}`,
        totalDuration: duration,
        totalChunks,
        chunkDuration: this.chunkDuration,
        format: this.audioFormat,
        sampleRate: 44100,
        bitrate: 128000,
        channels: this.audioFormat === 'wav' ? 1 : 2,
      };

      console.log('[RealAudioDemo] Stream ready:', {
        fileSize: audioSize,
        totalChunks,
        chunkSize,
        metadata: this.metadata,
      });

      if (!this.metadata) {
        throw new Error('Failed to create metadata');
      }

      return this.metadata;
    } catch (error) {
      console.error('[RealAudioDemo] Failed to start stream:', error);
      throw error;
    }
  }

  stopStream(): void {
    this.chunks.clear();
    this.loadingChunks.clear();
    this.metadata = null;
    // Don't clear the audio buffer here - keep it loaded
    this.lastPlayedChunk = -1;
  }

  pauseStream(): void {
    console.log('[RealAudioDemo] Stream paused');
  }

  resumeStream(): void {
    console.log('[RealAudioDemo] Stream resumed');
  }

  async getChunk(sequenceNumber: number): Promise<AudioChunk> {
    if (!this.metadata || !this.audioBuffer) {
      throw new Error('Stream not initialized. Call startStream() first.');
    }

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

  isStreamReady(): boolean {
    return !!(this.metadata && this.audioBuffer);
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
  setSimulateNetworkDelay(enabled: boolean, delayMs: number = 100): void {
    this.simulateNetworkDelay = enabled;
    this.chunkLoadTime = delayMs;
  }

  // Private methods
  private async loadChunk(sequenceNumber: number): Promise<AudioChunk> {
    // Store metadata and buffer references at start to avoid null issues
    const metadata = this.metadata;
    const audioBuffer = this.audioBuffer;

    if (!metadata || !audioBuffer) {
      throw new Error('Stream not initialized. Call startStream() first.');
    }

    if (sequenceNumber >= metadata.totalChunks) {
      throw new Error(`Chunk ${sequenceNumber} exceeds total chunks (${metadata.totalChunks})`);
    }

    this.loadingChunks.add(sequenceNumber);
    this.notifyBufferStateChange();

    try {
      // Simulate network delay
      if (this.simulateNetworkDelay) {
        await new Promise(resolve => setTimeout(resolve, this.chunkLoadTime));
      }

      // Extract chunk from the full audio buffer
      // Use the stored references to avoid null issues after async operations
      const bytesPerChunk = Math.floor(audioBuffer.byteLength / metadata.totalChunks);
      const start = sequenceNumber * bytesPerChunk;
      const end = Math.min(start + bytesPerChunk, audioBuffer.byteLength);

      // Create a slice of the audio data
      const chunkData = audioBuffer.slice(start, end);

      const chunk: AudioChunk = {
        id: `real-chunk-${sequenceNumber}`,
        sequenceNumber,
        startTime: sequenceNumber * metadata.chunkDuration,
        duration: metadata.chunkDuration,
        size: chunkData.byteLength,
        data: chunkData,
      };

      this.chunks.set(sequenceNumber, chunk);
      this.loadingChunks.delete(sequenceNumber);

      console.log(`[RealAudioDemo] Loaded chunk ${sequenceNumber} (${chunk.size} bytes)`);

      this.notifyChunkReady(chunk);
      this.notifyBufferStateChange();

      // Check if this was the last chunk
      if (sequenceNumber === metadata.totalChunks - 1) {
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

  private notifyStreamEnd(): void {
    console.log('[RealAudioDemo] Stream ended');
    this.endHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        console.error('Error in end handler:', error);
      }
    });
  }
}
