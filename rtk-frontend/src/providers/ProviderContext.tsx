/**
 * Provider Context
 *
 * React context for accessing providers throughout the app
 * Provides hooks for type-safe provider access
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  ProviderRegistry,
  TTSProvider,
  AudioPlayerProvider,
  ReadingSessionProvider,
  AnalyticsProvider,
  BaseProvider
} from './types';
import { getProviderRegistry } from './ProviderRegistry';

interface ProviderContextValue {
  registry: ProviderRegistry;
  isInitialized: boolean;
  error: Error | null;
}

const ProviderContext = createContext<ProviderContextValue | null>(null);

interface ProviderContextProviderProps {
  children: ReactNode;
  registry?: ProviderRegistry;
}

export function ProviderContextProvider({
  children,
  registry = getProviderRegistry()
}: ProviderContextProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initProviders() {
      try {
        await registry.initializeAll();
        if (mounted) {
          setIsInitialized(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize providers'));
          console.error('[ProviderContext] Initialization failed:', err);
        }
      }
    }

    initProviders();

    return () => {
      mounted = false;
      // Note: We don't cleanup here as the app might still need providers
      // Cleanup should happen when the app unmounts
    };
  }, [registry]);

  return (
    <ProviderContext.Provider value={{ registry, isInitialized, error }}>
      {children}
    </ProviderContext.Provider>
  );
}

/**
 * Hook to access the provider context
 */
export function useProviderContext(): ProviderContextValue {
  const context = useContext(ProviderContext);
  if (!context) {
    throw new Error('useProviderContext must be used within ProviderContextProvider');
  }
  return context;
}

/**
 * Hook to access a specific provider by type
 */
export function useProvider<T extends BaseProvider>(type: string): T {
  const { registry, isInitialized } = useProviderContext();

  if (!isInitialized) {
    throw new Error(`Cannot use provider '${type}' before initialization`);
  }

  return registry.get<T>(type);
}

/**
 * Type-safe hooks for specific providers
 */
export function useTTSProvider(): TTSProvider {
  return useProvider<TTSProvider>('tts');
}

export function useAudioPlayerProvider(): AudioPlayerProvider {
  return useProvider<AudioPlayerProvider>('audioPlayer');
}

export function useReadingSessionProvider(): ReadingSessionProvider {
  return useProvider<ReadingSessionProvider>('readingSession');
}

export function useAnalyticsProvider(): AnalyticsProvider {
  return useProvider<AnalyticsProvider>('analytics');
}

/**
 * Hook to check if providers are ready
 */
export function useProvidersReady(): boolean {
  const { isInitialized, error } = useProviderContext();
  return isInitialized && !error;
}

/**
 * Hook to get provider initialization error
 */
export function useProviderError(): Error | null {
  const { error } = useProviderContext();
  return error;
}
