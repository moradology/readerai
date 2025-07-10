/**
 * Application-Level Provider Components
 *
 * Responsibilities:
 * - Wrap the app with all necessary providers (Redux, Theme, etc.)
 * - Configure React Query/RTK Query providers
 * - Set up error boundaries
 * - Initialize service providers (TTS, Audio, Analytics)
 * - Handle provider composition and ordering
 * - Manage provider configuration based on environment
 */

import { useEffect, type ReactNode } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from './store';
import { useAppSelector } from './hooks';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { ProviderContextProvider, configureProviders } from '@providers/index';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Main provider component that wraps the entire application
 * Order matters: outermost providers should be the most fundamental
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <ReduxProvider store={store}>
        {/* Theme provider would go here */}
        {/* <ThemeProvider theme={theme}> */}

        {/* Provider context for swappable implementations */}
        <ProviderContextProvider>
          {/* Service provider initialization */}
          <ServiceInitializer>
            {/* Feature flag provider */}
            {/* <FeatureFlagProvider> */}

              {/* Any other providers */}
              {children}

            {/* </FeatureFlagProvider> */}
          </ServiceInitializer>
        </ProviderContextProvider>

        {/* </ThemeProvider> */}
      </ReduxProvider>
    </ErrorBoundary>
  );
}

/**
 * Service initializer component
 * Initializes singleton services on mount
 */
function ServiceInitializer({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Configure providers based on environment
    configureProviders();

    // Initialize WebSocket service when ready
    // if (import.meta.env.VITE_FEATURE_WEBSOCKET === 'true') {
    //   WebSocketService.getInstance().initialize();
    // }

    // Cleanup is handled by ProviderContext
  }, []);

  return <>{children}</>;
}

/**
 * Hook to ensure providers are properly set up
 * Throws if used outside of providers
 */
export function useEnsureProviders() {
  // This will throw if Redux provider is missing
  try {
    // Try to use a selector to verify store is available
    useAppSelector((state) => state);
  } catch (error) {
    throw new Error(
      'useEnsureProviders must be used within AppProviders. ' +
      'Make sure your component is wrapped with <AppProviders>'
    );
  }
}
