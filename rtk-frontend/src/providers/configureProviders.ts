/**
 * Provider Configuration
 *
 * Configures and registers providers based on environment
 * Allows switching between demo, real, and offline implementations
 */

import { getProviderRegistry } from './ProviderRegistry';
import { getDemoTTSProvider } from './tts/DemoTTSProvider';
import { getDemoAudioPlayerProvider } from './audio/DemoAudioPlayerProvider';
import { getDemoReadingSessionProvider } from './session/DemoReadingSessionProvider';
import type { ProvidersConfig, AnalyticsProvider, BaseProvider } from './types';

// Demo Analytics Provider (minimal implementation)
class DemoAnalyticsProvider implements AnalyticsProvider {
  readonly name = 'Demo Analytics';
  readonly version = '1.0.0';
  readonly type = 'demo' as const;
  private ready = false;

  async initialize(): Promise<void> {
    this.ready = true;
    console.log('[DemoAnalytics] Initialized');
  }

  cleanup(): void {
    this.ready = false;
  }

  isReady(): boolean {
    return this.ready;
  }

  trackEvent(eventName: string, properties?: Record<string, any>): void {
    console.log('[DemoAnalytics] Event:', eventName, properties);
  }

  trackPageView(pageName: string, properties?: Record<string, any>): void {
    console.log('[DemoAnalytics] Page View:', pageName, properties);
  }

  trackTiming(category: string, variable: string, time: number): void {
    console.log('[DemoAnalytics] Timing:', { category, variable, time });
  }

  identify(userId: string, traits?: Record<string, any>): void {
    console.log('[DemoAnalytics] Identify:', userId, traits);
  }

  startSession(): void {
    console.log('[DemoAnalytics] Session started');
  }

  endSession(): void {
    console.log('[DemoAnalytics] Session ended');
  }
}

/**
 * Get default provider configuration based on environment
 */
export function getDefaultProvidersConfig(): ProvidersConfig {
  const isDevelopment = import.meta.env.DEV;
  const isMockMode = import.meta.env.VITE_MOCK_API === 'true';
  const isOfflineMode = import.meta.env.VITE_OFFLINE_MODE === 'true';

  // Default to demo in development or when mocking is enabled
  const defaultType = (isDevelopment || isMockMode) ? 'demo' : 'real';

  return {
    tts: {
      type: isOfflineMode ? 'offline' : defaultType,
    },
    audioPlayer: {
      type: defaultType, // Audio player is always local
    },
    readingSession: {
      type: isOfflineMode ? 'offline' : defaultType,
    },
    analytics: {
      type: defaultType,
    },
  };
}

/**
 * Configure providers based on config
 */
export function configureProviders(config: ProvidersConfig = getDefaultProvidersConfig()): void {
  const registry = getProviderRegistry();

  // Clear existing providers
  registry.cleanupAll();

  // Register TTS Provider
  if (config.tts.type === 'demo') {
    registry.register('tts', getDemoTTSProvider());
  } else if (config.tts.type === 'real') {
    // TODO: Register real TTS provider
    console.warn('[configureProviders] Real TTS provider not implemented, using demo');
    registry.register('tts', getDemoTTSProvider());
  } else {
    // TODO: Register offline TTS provider
    console.warn('[configureProviders] Offline TTS provider not implemented, using demo');
    registry.register('tts', getDemoTTSProvider());
  }

  // Register Audio Player Provider
  if (config.audioPlayer.type === 'demo') {
    registry.register('audioPlayer', getDemoAudioPlayerProvider());
  } else {
    // TODO: Register real audio player provider
    console.warn('[configureProviders] Real audio player not implemented, using demo');
    registry.register('audioPlayer', getDemoAudioPlayerProvider());
  }

  // Register Reading Session Provider
  if (config.readingSession.type === 'demo') {
    registry.register('readingSession', getDemoReadingSessionProvider());
  } else if (config.readingSession.type === 'real') {
    // TODO: Register real reading session provider
    console.warn('[configureProviders] Real reading session provider not implemented, using demo');
    registry.register('readingSession', getDemoReadingSessionProvider());
  } else {
    // TODO: Register offline reading session provider
    console.warn('[configureProviders] Offline reading session provider not implemented, using demo');
    registry.register('readingSession', getDemoReadingSessionProvider());
  }

  // Register Analytics Provider
  if (config.analytics.type === 'demo') {
    registry.register('analytics', new DemoAnalyticsProvider());
  } else {
    // TODO: Register real analytics provider (e.g., Google Analytics, Mixpanel)
    console.warn('[configureProviders] Real analytics provider not implemented, using demo');
    registry.register('analytics', new DemoAnalyticsProvider());
  }

  console.log('[configureProviders] Providers configured:', config);
}

/**
 * Helper to switch provider at runtime (useful for testing)
 */
export function switchProvider(type: string, provider: BaseProvider): void {
  const registry = getProviderRegistry();

  // Cleanup existing provider
  if (registry.has(type)) {
    const existing = registry.get(type);
    if (existing.isReady()) {
      existing.cleanup();
    }
  }

  // Register new provider
  registry.register(type, provider);

  // Initialize if registry is already initialized
  if (provider.isReady()) {
    return;
  }

  provider.initialize().catch(error => {
    console.error(`[switchProvider] Failed to initialize ${type}:`, error);
  });
}
