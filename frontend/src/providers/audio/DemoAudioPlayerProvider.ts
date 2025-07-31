/**
 * Demo Audio Player Provider
 *
 * Simulates audio playback for development and testing
 * Provides timing events without actual audio playback
 */

import type { AudioPlayerProvider } from '../types';

type EventCallback<T = void> = T extends void ? () => void : (arg: T) => void;
type UnsubscribeFn = () => void;

export class DemoAudioPlayerProvider implements AudioPlayerProvider {
  readonly name = 'Demo Audio Player';
  readonly version = '1.0.0';
  readonly type = 'demo' as const;

  private ready = false;
  private loaded = false;
  private playing = false;
  private currentTime = 0;
  private duration = 0;
  private playbackRate = 1;
  private volume = 1;
  // private _audioUrl: string | null = null;
  private playbackInterval: number | null = null;

  // Event listeners
  private timeUpdateCallbacks = new Set<EventCallback<number>>();
  private endedCallbacks = new Set<EventCallback>();
  private errorCallbacks = new Set<EventCallback<Error>>();
  private loadStartCallbacks = new Set<EventCallback>();
  private loadCompleteCallbacks = new Set<EventCallback>();

  async initialize(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
    this.ready = true;
    console.log('[DemoAudioPlayer] Initialized');
  }

  cleanup(): void {
    this.stop();
    this.clearAllListeners();
    this.ready = false;
    console.log('[DemoAudioPlayer] Cleaned up');
  }

  isReady(): boolean {
    return this.ready;
  }

  async load(url: string): Promise<void> {
    if (!this.ready) {
      throw new Error('Audio player not initialized');
    }

    this.stop();
    this.loaded = false;
    // this._audioUrl = url;

    // Notify load start
    this.loadStartCallbacks.forEach(cb => cb());

    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Set a mock duration (e.g., 2 minutes)
    this.duration = 120;
    this.currentTime = 0;
    this.loaded = true;

    // Notify load complete
    this.loadCompleteCallbacks.forEach(cb => cb());

    console.log('[DemoAudioPlayer] Loaded:', url);
  }

  async play(): Promise<void> {
    if (!this.loaded) {
      throw new Error('No audio loaded');
    }

    if (this.playing) {
      return;
    }

    this.playing = true;
    console.log('[DemoAudioPlayer] Playing');

    // Start playback simulation
    const updateInterval = 100; // Update every 100ms
    this.playbackInterval = window.setInterval(() => {
      if (!this.playing) {
        return;
      }

      // Update current time based on playback rate
      this.currentTime += (updateInterval / 1000) * this.playbackRate;

      // Check if reached end
      if (this.currentTime >= this.duration) {
        this.currentTime = this.duration;
        this.stop();
        this.endedCallbacks.forEach(cb => cb());
        return;
      }

      // Notify time update
      this.timeUpdateCallbacks.forEach(cb => cb(this.currentTime));
    }, updateInterval);
  }

  pause(): void {
    if (!this.playing) {
      return;
    }

    this.playing = false;
    this.stopPlaybackInterval();
    console.log('[DemoAudioPlayer] Paused at', this.currentTime);
  }

  stop(): void {
    this.playing = false;
    this.currentTime = 0;
    this.stopPlaybackInterval();
    console.log('[DemoAudioPlayer] Stopped');
  }

  seek(time: number): void {
    if (!this.loaded) {
      throw new Error('No audio loaded');
    }

    this.currentTime = Math.max(0, Math.min(time, this.duration));
    this.timeUpdateCallbacks.forEach(cb => cb(this.currentTime));
    console.log('[DemoAudioPlayer] Seeked to', this.currentTime);
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getDuration(): number {
    return this.duration;
  }

  getPlaybackRate(): number {
    return this.playbackRate;
  }

  getVolume(): number {
    return this.volume;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.1, Math.min(rate, 4));
    console.log('[DemoAudioPlayer] Playback rate set to', this.playbackRate);
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(volume, 1));
    console.log('[DemoAudioPlayer] Volume set to', this.volume);
  }

  onTimeUpdate(callback: EventCallback<number>): UnsubscribeFn {
    this.timeUpdateCallbacks.add(callback);
    return () => this.timeUpdateCallbacks.delete(callback);
  }

  onEnded(callback: EventCallback): UnsubscribeFn {
    this.endedCallbacks.add(callback);
    return () => this.endedCallbacks.delete(callback);
  }

  onError(callback: EventCallback<Error>): UnsubscribeFn {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  onLoadStart(callback: EventCallback): UnsubscribeFn {
    this.loadStartCallbacks.add(callback);
    return () => this.loadStartCallbacks.delete(callback);
  }

  onLoadComplete(callback: EventCallback): UnsubscribeFn {
    this.loadCompleteCallbacks.add(callback);
    return () => this.loadCompleteCallbacks.delete(callback);
  }

  private stopPlaybackInterval(): void {
    if (this.playbackInterval !== null) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  private clearAllListeners(): void {
    this.timeUpdateCallbacks.clear();
    this.endedCallbacks.clear();
    this.errorCallbacks.clear();
    this.loadStartCallbacks.clear();
    this.loadCompleteCallbacks.clear();
  }
}

// Singleton instance
let instance: DemoAudioPlayerProvider | null = null;

export function getDemoAudioPlayerProvider(): DemoAudioPlayerProvider {
  if (!instance) {
    instance = new DemoAudioPlayerProvider();
  }
  return instance;
}
