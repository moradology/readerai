/**
 * Demo TTS Provider
 *
 * Provides a mock TTS implementation for development and demo purposes
 * Generates fake audio URLs and word timings without actual speech synthesis
 */

import type { TTSProvider, TTSOptions, TTSResult, TTSVoice } from '../types';
import type { WordTiming } from '@features/reading/api/types';

export class DemoTTSProvider implements TTSProvider {
  readonly name = 'Demo TTS Provider';
  readonly version = '1.0.0';
  readonly type = 'demo' as const;

  private ready = false;
  private synthesisInProgress = false;
  private abortController: AbortController | null = null;

  async initialize(): Promise<void> {
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 100));
    this.ready = true;
    console.log('[DemoTTS] Initialized');
  }

  cleanup(): void {
    this.cancel();
    this.ready = false;
    console.log('[DemoTTS] Cleaned up');
  }

  isReady(): boolean {
    return this.ready;
  }

  async synthesize(text: string, options?: TTSOptions): Promise<TTSResult> {
    if (!this.ready) {
      throw new Error('TTS Provider not initialized');
    }

    if (this.synthesisInProgress) {
      throw new Error('Synthesis already in progress');
    }

    this.synthesisInProgress = true;
    this.abortController = new AbortController();

    try {
      // Simulate processing delay
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 500);
        this.abortController?.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Synthesis cancelled'));
        });
      });

      // Generate mock word timings
      const words = text.split(/\s+/);
      const wordsPerMinute = 150 * (options?.rate || 1);
      const averageWordDuration = 60000 / wordsPerMinute; // ms per word

      let currentTime = 0;
      const wordTimings: WordTiming[] = words.map((word, index) => {
        const duration = averageWordDuration * (0.8 + Math.random() * 0.4); // Add variation
        const timing: WordTiming = {
          word,
          startTime: currentTime,
          endTime: currentTime + duration,
          wordIndex: index,
          confidence: 0.95 + Math.random() * 0.05,
        };
        currentTime += duration;
        return timing;
      });

      const totalDuration = currentTime / 1000; // Convert to seconds

      // Generate a mock audio URL
      const audioUrl = `/demo-audio/${Date.now()}.mp3`;

      return {
        audioUrl,
        duration: totalDuration,
        wordTimings,
        format: 'mp3',
      };
    } finally {
      this.synthesisInProgress = false;
      this.abortController = null;
    }
  }

  async getVoices(): Promise<TTSVoice[]> {
    if (!this.ready) {
      throw new Error('TTS Provider not initialized');
    }

    // Return mock voices
    return [
      {
        id: 'demo-voice-1',
        name: 'Demo Voice 1 (Female)',
        language: 'en-US',
        gender: 'female',
        premium: false,
      },
      {
        id: 'demo-voice-2',
        name: 'Demo Voice 2 (Male)',
        language: 'en-US',
        gender: 'male',
        premium: false,
      },
      {
        id: 'demo-voice-3',
        name: 'Demo Voice 3 (Child)',
        language: 'en-US',
        gender: 'neutral',
        premium: true,
      },
    ];
  }

  async preload(text: string, _options?: TTSOptions): Promise<void> {
    if (!this.ready) {
      throw new Error('TTS Provider not initialized');
    }

    // In a real implementation, this would pre-generate and cache the audio
    console.log('[DemoTTS] Preloading text:', text.substring(0, 50) + '...');
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      this.synthesisInProgress = false;
      console.log('[DemoTTS] Synthesis cancelled');
    }
  }
}

// Singleton instance
let instance: DemoTTSProvider | null = null;

export function getDemoTTSProvider(): DemoTTSProvider {
  if (!instance) {
    instance = new DemoTTSProvider();
  }
  return instance;
}
