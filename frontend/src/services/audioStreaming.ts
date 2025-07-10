// Audio streaming service for handling server-side TTS

export interface AudioStreamConfig {
  onProgress?: (currentTime: number) => void;
  onStateChange?: (state: AudioStreamState) => void;
  onError?: (error: Error) => void;
}

export type AudioStreamState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

export class AudioStreamingService {
  private audio: HTMLAudioElement | null = null;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private audioContext: AudioContext | null = null;
  // private currentStreamUrl: string | null = null;
  private state: AudioStreamState = 'idle';
  private config: AudioStreamConfig;
  private progressInterval: number | null = null;

  constructor(config: AudioStreamConfig = {}) {
    this.config = config;

    // Initialize Web Audio API context
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }
  }

  async startStream(streamUrl: string): Promise<void> {
    try {
      this.cleanup();
      this.setState('loading');

      // Create audio element
      this.audio = new Audio();
      // this.currentStreamUrl = streamUrl;

      // For simple streaming, we can use direct URL
      // For more control, we'd use MediaSource API
      this.audio.src = streamUrl;
      this.audio.preload = 'auto';

      // Set up event handlers
      this.setupAudioEventHandlers();

      // Start loading
      await this.audio.load();

    } catch (error) {
      this.setState('error');
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  async startAdvancedStream(streamUrl: string): Promise<void> {
    // Advanced streaming with MediaSource API for better control
    if (!('MediaSource' in window)) {
      // Fallback to simple streaming
      return this.startStream(streamUrl);
    }

    try {
      this.cleanup();
      this.setState('loading');

      this.mediaSource = new MediaSource();
      this.audio = new Audio();
      this.audio.src = URL.createObjectURL(this.mediaSource);

      await new Promise((resolve, reject) => {
        this.mediaSource!.addEventListener('sourceopen', resolve);
        this.mediaSource!.addEventListener('error', reject);
      });

      // Fetch audio stream
      const response = await fetch(streamUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      // Create source buffer
      const mimeType = response.headers.get('content-type') || 'audio/mpeg';
      this.sourceBuffer = this.mediaSource!.addSourceBuffer(mimeType);

      // Stream chunks
      let totalBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append chunk to source buffer
        await this.appendBuffer(value);
        totalBytes += value.byteLength;
      }

      this.mediaSource!.endOfStream();
      this.setupAudioEventHandlers();

    } catch (error) {
      this.setState('error');
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  private async appendBuffer(chunk: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.sourceBuffer) {
        reject(new Error('No source buffer'));
        return;
      }

      const handleUpdate = () => {
        this.sourceBuffer!.removeEventListener('updateend', handleUpdate);
        this.sourceBuffer!.removeEventListener('error', handleError);
        resolve();
      };

      const handleError = () => {
        this.sourceBuffer!.removeEventListener('updateend', handleUpdate);
        this.sourceBuffer!.removeEventListener('error', handleError);
        reject(new Error('Source buffer error'));
      };

      this.sourceBuffer.addEventListener('updateend', handleUpdate);
      this.sourceBuffer.addEventListener('error', handleError);

      try {
        this.sourceBuffer.appendBuffer(chunk);
      } catch (error) {
        handleError();
      }
    });
  }

  private setupAudioEventHandlers(): void {
    if (!this.audio) return;

    this.audio.addEventListener('canplay', () => {
      if (this.state === 'loading') {
        this.setState('paused');
      }
    });

    this.audio.addEventListener('play', () => {
      this.setState('playing');
      this.startProgressTracking();
    });

    this.audio.addEventListener('pause', () => {
      this.setState('paused');
      this.stopProgressTracking();
    });

    this.audio.addEventListener('ended', () => {
      this.setState('ended');
      this.stopProgressTracking();
    });

    this.audio.addEventListener('error', (e) => {
      this.setState('error');
      this.config.onError?.(new Error(`Audio error: ${e.type}`));
      this.stopProgressTracking();
    });
  }

  private startProgressTracking(): void {
    this.stopProgressTracking();

    this.progressInterval = window.setInterval(() => {
      if (this.audio && !this.audio.paused) {
        this.config.onProgress?.(this.audio.currentTime);
      }
    }, 100); // Update every 100ms
  }

  private stopProgressTracking(): void {
    if (this.progressInterval !== null) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  async play(): Promise<void> {
    if (!this.audio) {
      throw new Error('No audio loaded');
    }

    // Resume audio context if suspended (browser policy)
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }

    await this.audio.play();
  }

  pause(): void {
    this.audio?.pause();
  }

  seek(time: number): void {
    if (this.audio) {
      this.audio.currentTime = time;
    }
  }

  setPlaybackRate(rate: number): void {
    if (this.audio) {
      this.audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    }
  }

  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  get currentTime(): number {
    return this.audio?.currentTime || 0;
  }

  get duration(): number {
    return this.audio?.duration || 0;
  }

  get playbackRate(): number {
    return this.audio?.playbackRate || 1;
  }

  get volume(): number {
    return this.audio?.volume || 1;
  }

  get currentState(): AudioStreamState {
    return this.state;
  }

  private setState(state: AudioStreamState): void {
    this.state = state;
    this.config.onStateChange?.(state);
  }

  cleanup(): void {
    this.stopProgressTracking();

    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }

    if (this.mediaSource) {
      if (this.mediaSource.readyState === 'open') {
        this.mediaSource.endOfStream();
      }
      this.mediaSource = null;
    }

    this.sourceBuffer = null;
    // this.currentStreamUrl = null;
    this.setState('idle');
  }
}

// Factory function for creating audio streaming instances
export function createAudioStreamer(config?: AudioStreamConfig): AudioStreamingService {
  return new AudioStreamingService(config);
}
