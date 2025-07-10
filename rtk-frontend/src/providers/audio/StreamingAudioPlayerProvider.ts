/**
 * Streaming Audio Player Provider
 *
 * Enhanced audio player that supports HTTP streaming with buffering
 */

import type { AudioPlayerProvider } from '@providers/types';
import type {
  AudioStreamingService,
  AudioStreamMetadata,
  AudioChunk,
  StreamingAudioPlayer
} from '@shared/audio/types';
import type { WordTiming } from '@features/reading/api/types';

export class StreamingAudioPlayerProvider implements AudioPlayerProvider, StreamingAudioPlayer {
  readonly name = 'StreamingAudioPlayerProvider';
  readonly version = '1.0.0';
  readonly type = 'real' as const;

  private audio: HTMLAudioElement;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private streamService: AudioStreamingService | null = null;
  private metadata: AudioStreamMetadata | null = null;

  // State
  private isInitialized = false;
  private isLoading = false;
  private loadedChunks = new Set<number>();
  private pendingChunks: AudioChunk[] = [];
  private currentChunkIndex = 0;

  // Event handlers
  private timeUpdateHandlers = new Set<(time: number) => void>();
  private endedHandlers = new Set<() => void>();
  private errorHandlers = new Set<(error: Error) => void>();
  private loadStartHandlers = new Set<() => void>();
  private loadCompleteHandlers = new Set<() => void>();

  constructor() {
    this.audio = new Audio();
    this.setupAudioEventListeners();
  }

  async initialize(): Promise<void> {
    // Check for MediaSource API support
    if (!window.MediaSource) {
      throw new Error('MediaSource API not supported');
    }

    this.isInitialized = true;
  }

  cleanup(): void {
    this.stop();
    this.cleanupMediaSource();
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
      // For non-streaming URLs, use standard loading
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
    await this.audio.play();
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
    if (this.streamService && this.metadata) {
      // For streaming, we need to ensure the chunk is loaded
      const chunkIndex = Math.floor(time / this.metadata.chunkDuration);
      this.seekToChunk(chunkIndex).then(() => {
        this.audio.currentTime = time;
      });
    } else {
      this.audio.currentTime = time;
    }
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
    return !this.isLoading && (this.audio.readyState >= 2 || this.mediaSource !== null);
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
      this.streamService = streamService;
      this.metadata = metadata;

      // Set up MediaSource
      await this.setupMediaSource(metadata);

      // Subscribe to stream events
      this.setupStreamEventListeners();

      // Start loading initial chunks
      await this.loadInitialChunks();

      this.isLoading = false;
      this.notifyLoadComplete();
    } catch (error) {
      this.isLoading = false;
      this.notifyError(error as Error);
      throw error;
    }
  }

  async playWhenReady(): Promise<void> {
    // Wait for enough buffer before playing
    const minBuffer = 2; // seconds

    while (this.getBufferedEnd() - this.audio.currentTime < minBuffer) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await this.play();
  }

  canPlayThrough(): boolean {
    if (!this.streamService || !this.metadata) {
      return this.audio.readyState === 4;
    }

    const bufferState = this.streamService.getBufferState();
    return bufferState.bufferHealth === 'good' || bufferState.bufferHealth === 'full';
  }

  async seekToChunk(chunkNumber: number): Promise<void> {
    if (!this.streamService || !this.metadata) {
      throw new Error('No stream loaded');
    }

    this.currentChunkIndex = chunkNumber;

    // Ensure chunk is loaded
    if (!this.loadedChunks.has(chunkNumber)) {
      const chunk = await this.streamService.getChunk(chunkNumber);
      await this.appendChunk(chunk);
    }

    // Seek to chunk start time
    this.audio.currentTime = chunkNumber * this.metadata.chunkDuration;
  }

  async seekToTime(time: number): Promise<void> {
    if (!this.metadata) {
      this.audio.currentTime = time;
      return;
    }

    const chunkIndex = Math.floor(time / this.metadata.chunkDuration);
    await this.seekToChunk(chunkIndex);
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

    // Binary search for efficiency
    let left = 0;
    let right = wordTimings.length - 1;
    let result = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const timing = wordTimings[mid];

      if (timing && timing.startTime <= currentTime && timing.endTime >= currentTime) {
        return mid;
      } else if (timing && timing.endTime < currentTime) {
        result = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return result;
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
  private async setupMediaSource(metadata: AudioStreamMetadata): Promise<void> {
    this.cleanupMediaSource();

    this.mediaSource = new MediaSource();
    this.audio.src = URL.createObjectURL(this.mediaSource);

    await new Promise<void>((resolve, reject) => {
      this.mediaSource!.addEventListener('sourceopen', () => {
        try {
          const mimeType = this.getMimeType(metadata.format);
          this.sourceBuffer = this.mediaSource!.addSourceBuffer(mimeType);
          this.sourceBuffer.mode = 'sequence';

          // Set up source buffer event listeners
          this.sourceBuffer.addEventListener('updateend', () => {
            this.processPendingChunks();
          });

          resolve();
        } catch (error) {
          reject(error);
        }
      }, { once: true });

      this.mediaSource!.addEventListener('error', () => {
        reject(new Error('MediaSource error'));
      }, { once: true });
    });
  }

  private cleanupMediaSource(): void {
    if (this.audio.src && this.audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.audio.src);
    }

    this.sourceBuffer = null;
    this.mediaSource = null;
    this.loadedChunks.clear();
    this.pendingChunks = [];
  }

  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg; codecs=opus',
      webm: 'audio/webm; codecs=opus',
    };

    return mimeTypes[format] || 'audio/mpeg';
  }

  private async loadInitialChunks(): Promise<void> {
    if (!this.streamService || !this.metadata) return;

    // Load first few chunks
    const initialChunks = Math.min(3, this.metadata.totalChunks);

    for (let i = 0; i < initialChunks; i++) {
      const chunk = await this.streamService.getChunk(i);
      await this.appendChunk(chunk);
    }
  }

  private async appendChunk(chunk: AudioChunk): Promise<void> {
    if (!this.sourceBuffer || this.loadedChunks.has(chunk.sequenceNumber)) {
      return;
    }

    if (this.sourceBuffer.updating) {
      // Queue for later
      this.pendingChunks.push(chunk);
      return;
    }

    try {
      this.sourceBuffer.appendBuffer(chunk.data);
      this.loadedChunks.add(chunk.sequenceNumber);
    } catch (error) {
      console.error('Error appending chunk:', error);
      this.notifyError(error as Error);
    }
  }

  private processPendingChunks(): void {
    if (!this.sourceBuffer || this.sourceBuffer.updating || this.pendingChunks.length === 0) {
      return;
    }

    const chunk = this.pendingChunks.shift()!;
    this.appendChunk(chunk);
  }

  private setupAudioEventListeners(): void {
    this.audio.addEventListener('timeupdate', () => {
      const time = this.audio.currentTime;
      this.timeUpdateHandlers.forEach(handler => handler(time));

      // Check if we need to load more chunks
      if (this.streamService && this.metadata) {
        const currentChunk = Math.floor(time / this.metadata.chunkDuration);
        if (currentChunk > this.currentChunkIndex) {
          this.currentChunkIndex = currentChunk;
          this.loadNextChunks();
        }
      }
    });

    this.audio.addEventListener('ended', () => {
      this.endedHandlers.forEach(handler => handler());
    });

    this.audio.addEventListener('error', (e) => {
      const error = new Error(`Audio error: ${e.type}`);
      this.errorHandlers.forEach(handler => handler(error));
    });
  }

  private setupStreamEventListeners(): void {
    if (!this.streamService) return;

    this.streamService.onChunkReady(async (chunk) => {
      // Auto-append chunks as they become ready
      if (this.sourceBuffer && !this.sourceBuffer.updating) {
        await this.appendChunk(chunk);
      }
    });

    this.streamService.onStreamError((error) => {
      this.notifyError(error);
    });

    this.streamService.onBufferStateChange((state) => {
      // Handle buffer state changes
      if (state.bufferHealth === 'empty' && this.isPlaying()) {
        // Pause if buffer is empty
        this.pause();
      }
    });
  }

  private async loadNextChunks(): Promise<void> {
    if (!this.streamService || !this.metadata) return;

    // Prefetch next few chunks
    const chunksAhead = 3;
    await this.streamService.prefetchChunks(
      this.currentChunkIndex + 1,
      chunksAhead
    );
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
