/**
 * Simple Streaming Audio Player
 *
 * Uses HTML5 audio with blob URLs for demo purposes
 * In production, would use MediaSource API
 */

import type { AudioPlayerProvider } from '@providers/types';
import type {
  AudioStreamingService,
  AudioStreamMetadata,
  AudioChunk,
  StreamingAudioPlayer
} from '@shared/audio/types';
import type { WordTiming } from '@features/reading/api/types';

export class SimpleStreamingAudioPlayer implements AudioPlayerProvider, StreamingAudioPlayer {
  readonly name = 'SimpleStreamingAudioPlayer';
  readonly version = '1.0.0';
  readonly type = 'demo' as const;

  private audio: HTMLAudioElement;
  private streamService: AudioStreamingService | null = null;
  private metadata: AudioStreamMetadata | null = null;
  private currentBlobUrl: string | null = null;

  // State
  private isInitialized = false;
  private isLoading = false;

  // Event handlers
  private timeUpdateHandlers = new Set<(time: number) => void>();
  private endedHandlers = new Set<() => void>();
  private errorHandlers = new Set<(error: Error) => void>();
  private loadStartHandlers = new Set<() => void>();
  private loadCompleteHandlers = new Set<() => void>();

  constructor() {
    this.audio = new Audio();
    // Set CORS mode for cross-origin audio
    this.audio.crossOrigin = 'anonymous';
    // Enable preloading
    this.audio.preload = 'auto';
    this.setupAudioEventListeners();
  }

  async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  cleanup(): void {
    this.stop();
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
    this.audio.remove();
    this.timeUpdateHandlers.clear();
    this.endedHandlers.clear();
    this.errorHandlers.clear();
    this.loadStartHandlers.clear();
    this.loadCompleteHandlers.clear();
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  // Standard AudioPlayerProvider methods
  async load(url: string): Promise<void> {
    this.notifyLoadStart();
    this.isLoading = true;

    try {
      this.audio.src = url;
      await this.audio.load();
      this.isLoading = false;
      this.notifyLoadComplete();
    } catch (error) {
      this.isLoading = false;
      this.notifyError(error as Error);
      throw error;
    }
  }

  async play(): Promise<void> {
    try {
      await this.audio.play();
    } catch (error) {
      // Handle autoplay errors gracefully
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[SimpleStreamingPlayer] Play was interrupted:', error.message);
        // Re-throw to let the UI handle it
        throw error;
      }
      throw error;
    }
  }

  pause(): void {
    this.audio.pause();
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.streamService?.stopStream();
  }

  seek(time: number): void {
    this.audio.currentTime = time;
  }

  getCurrentTime(): number {
    return this.audio.currentTime;
  }

  getDuration(): number {
    return this.metadata?.totalDuration || this.audio.duration || 0;
  }

  getPlaybackRate(): number {
    return this.audio.playbackRate;
  }

  getVolume(): number {
    return this.audio.volume;
  }

  isPlaying(): boolean {
    return !this.audio.paused && !this.audio.ended;
  }

  isLoaded(): boolean {
    return !this.isLoading && this.audio.readyState >= 2;
  }

  setPlaybackRate(rate: number): void {
    this.audio.playbackRate = rate;
  }

  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  // StreamingAudioPlayer methods
  async loadStream(streamService: AudioStreamingService, metadata: AudioStreamMetadata): Promise<void> {
    this.notifyLoadStart();
    this.isLoading = true;

    try {
      if (!metadata) {
        throw new Error('Metadata is null');
      }

      this.streamService = streamService;
      this.metadata = metadata;

      // For demo, load all chunks and create a blob
      // In production, would use MediaSource for true streaming
      console.log('[SimpleStreamingPlayer] Loading all chunks for demo...', {
        totalChunks: metadata?.totalChunks,
        duration: metadata?.totalDuration,
      });

      const chunks: AudioChunk[] = [];
      for (let i = 0; i < metadata.totalChunks; i++) {
        try {
          const chunk = await streamService.getChunk(i);
          chunks.push(chunk);
        } catch (error) {
          console.error(`[SimpleStreamingPlayer] Failed to load chunk ${i}:`, error);
          throw error;
        }
      }

      // Combine all chunks into a single blob
      // Detect format from first few bytes of first chunk
      const firstChunk = chunks[0];
      if (!firstChunk) {
        throw new Error('No chunks loaded');
      }
      const headerView = new DataView(firstChunk.data.slice(0, 4));
      const isWav = headerView.getUint32(0, false) === 0x52494646; // "RIFF"
      const mimeType = isWav ? 'audio/wav' : 'audio/mpeg';

      const audioBlobs = chunks.map(chunk => new Blob([chunk.data], { type: mimeType }));
      const combinedBlob = new Blob(audioBlobs, { type: mimeType });

      // Create blob URL and load
      if (this.currentBlobUrl) {
        URL.revokeObjectURL(this.currentBlobUrl);
      }

      this.currentBlobUrl = URL.createObjectURL(combinedBlob);
      this.audio.src = this.currentBlobUrl;
      await this.audio.load();

      this.isLoading = false;
      this.notifyLoadComplete();

      console.log('[SimpleStreamingPlayer] Audio loaded and ready');
    } catch (error) {
      this.isLoading = false;
      this.notifyError(error as Error);
      throw error;
    }
  }

  async playWhenReady(): Promise<void> {
    // Wait for audio to be ready before playing
    if (this.audio.readyState < 2) {
      await new Promise<void>((resolve, reject) => {
        const handleCanPlay = () => {
          this.audio.removeEventListener('canplay', handleCanPlay);
          this.audio.removeEventListener('error', handleError);
          resolve();
        };
        const handleError = () => {
          this.audio.removeEventListener('canplay', handleCanPlay);
          this.audio.removeEventListener('error', handleError);
          reject(new Error('Failed to load audio'));
        };
        this.audio.addEventListener('canplay', handleCanPlay);
        this.audio.addEventListener('error', handleError);
      });
    }

    await this.play();
  }

  canPlayThrough(): boolean {
    return this.audio.readyState === 4;
  }

  async seekToChunk(chunkNumber: number): Promise<void> {
    if (!this.metadata) return;
    const time = chunkNumber * this.metadata.chunkDuration;
    this.audio.currentTime = time;
  }

  async seekToTime(time: number): Promise<void> {
    this.audio.currentTime = time;
  }

  getBufferTimeRanges(): TimeRanges {
    return this.audio.buffered;
  }

  getBufferedEnd(): number {
    const buffered = this.audio.buffered;
    return buffered.length > 0 ? buffered.end(buffered.length - 1) : 0;
  }

  getBufferedStart(): number {
    const buffered = this.audio.buffered;
    return buffered.length > 0 ? buffered.start(0) : 0;
  }

  getCurrentWordIndex(wordTimings: WordTiming[]): number {
    const currentTime = this.audio.currentTime * 1000; // Convert to milliseconds

    for (let i = 0; i < wordTimings.length; i++) {
      const timing = wordTimings[i];
      if (timing && timing.startTime <= currentTime && timing.endTime >= currentTime) {
        return i;
      }
    }

    // Return last word if past the end
    if (currentTime > 0 && wordTimings.length > 0) {
      const lastTiming = wordTimings[wordTimings.length - 1];
      if (lastTiming && currentTime > lastTiming.endTime) {
        return wordTimings.length - 1;
      }
    }

    return -1;
  }

  syncToWord(wordIndex: number, wordTimings: WordTiming[]): void {
    if (wordIndex >= 0 && wordIndex < wordTimings.length) {
      const timing = wordTimings[wordIndex];
      if (timing) {
        this.audio.currentTime = timing.startTime / 1000; // Convert to seconds
      }
    }
  }

  // Event handlers
  onTimeUpdate(callback: (time: number) => void): () => void {
    this.timeUpdateHandlers.add(callback);
    return () => this.timeUpdateHandlers.delete(callback);
  }

  onEnded(callback: () => void): () => void {
    this.endedHandlers.add(callback);
    return () => this.endedHandlers.delete(callback);
  }

  onError(callback: (error: Error) => void): () => void {
    this.errorHandlers.add(callback);
    return () => this.errorHandlers.delete(callback);
  }

  onLoadStart(callback: () => void): () => void {
    this.loadStartHandlers.add(callback);
    return () => this.loadStartHandlers.delete(callback);
  }

  onLoadComplete(callback: () => void): () => void {
    this.loadCompleteHandlers.add(callback);
    return () => this.loadCompleteHandlers.delete(callback);
  }

  // Private methods
  private setupAudioEventListeners(): void {
    this.audio.addEventListener('timeupdate', () => {
      const time = this.audio.currentTime;
      this.timeUpdateHandlers.forEach(handler => handler(time));
    });

    this.audio.addEventListener('ended', () => {
      this.endedHandlers.forEach(handler => handler());
    });

    this.audio.addEventListener('error', (e) => {
      const error = new Error(`Audio error: ${e.type}`);
      this.errorHandlers.forEach(handler => handler(error));
    });
  }

  private notifyLoadStart(): void {
    this.loadStartHandlers.forEach(handler => handler());
  }

  private notifyLoadComplete(): void {
    this.loadCompleteHandlers.forEach(handler => handler());
  }

  private notifyError(error: Error): void {
    this.errorHandlers.forEach(handler => handler(error));
  }
}
