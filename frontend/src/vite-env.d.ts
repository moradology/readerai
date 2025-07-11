/**
 * Vite Environment Type Definitions
 *
 * Responsibilities:
 * - Reference Vite client types
 * - Define import.meta.env types
 * - Declare module types for assets
 * - Support HMR types
 * - Define environment variable types
 * - Ensure proper TypeScript support for Vite features
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_TTS_PROVIDER: 'demo' | 'google' | 'polly' | 'azure';
  readonly VITE_AUDIO_PLAYER: 'html5' | 'webaudio';
  readonly VITE_WORD_DETECTION: 'time-based' | 'phoneme-based';
  readonly VITE_FEATURE_STREAMING: string;
  readonly VITE_FEATURE_OFFLINE_MODE: string;
  readonly VITE_FEATURE_ANALYTICS: string;
  readonly VITE_FEATURE_CHECKPOINTS: string;
  readonly VITE_FEATURE_INTERRUPTIONS: string;
  readonly VITE_MOCK_API: string;
  readonly VITE_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  readonly VITE_SHOW_PROVIDER_SELECTOR: string;
  readonly VITE_ANALYTICS_PROVIDER?: string;
  readonly VITE_ANALYTICS_KEY?: string;
  readonly VITE_GOOGLE_TTS_API_KEY?: string;
  readonly VITE_AWS_POLLY_ACCESS_KEY?: string;
  readonly VITE_AWS_POLLY_SECRET_KEY?: string;
  readonly VITE_AWS_POLLY_REGION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
