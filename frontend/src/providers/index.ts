/**
 * Providers Module
 *
 * Central export for all provider-related functionality
 */

// Types
export * from './types';

// Registry
export { getProviderRegistry, setProviderRegistry } from './ProviderRegistry';

// Context and hooks
export {
  ProviderContextProvider,
  useProviderContext,
  useProvider,
  useTTSProvider,
  useAudioPlayerProvider,
  useReadingSessionProvider,
  useAnalyticsProvider,
  useProvidersReady,
  useProviderError,
} from './ProviderContext';

// Configuration
export {
  getDefaultProvidersConfig,
  configureProviders,
  switchProvider,
} from './configureProviders';

// Demo providers (exported for testing)
export { getDemoTTSProvider } from './tts/DemoTTSProvider';
export { getDemoAudioPlayerProvider } from './audio/DemoAudioPlayerProvider';
export { getDemoReadingSessionProvider } from './session/DemoReadingSessionProvider';
