/**
 * Redux Store Configuration
 *
 * Responsibilities:
 * - Configure and export the Redux store with RTK
 * - Combine all feature reducers
 * - Apply middleware (RTK Query, listeners, custom middleware)
 * - Set up Redux DevTools integration
 * - Configure store enhancers and preloaded state
 * - Export typed hooks (useAppDispatch, useAppSelector)
 */

import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

// Import reducers (will be added as we create them)
import readingReducer from '@features/reading/store/readingSlice';
import { websocketReducer } from '@features/websocket/websocketSlice';
import { baseApi } from '@shared/api/baseApi';

// Custom middleware will be imported here
import { customMiddleware } from './middleware';
import { createWebSocketMiddleware } from './middleware/websocket';
import { getProviderRegistry } from '@providers/ProviderRegistry';
import type { WebSocketProvider } from '@providers/types';

// Define the root reducer
const rootReducer = {
  reading: readingReducer,
  websocket: websocketReducer,
  [baseApi.reducerPath]: baseApi.reducer,
};

// WebSocket provider getter
const getWebSocketProvider = (): WebSocketProvider | null => {
  const registry = getProviderRegistry();
  if (registry.has('websocket')) {
    return registry.get<WebSocketProvider>('websocket');
  }
  return null;
};

// Create WebSocket middleware
const websocketMiddleware = createWebSocketMiddleware(getWebSocketProvider);

// Create the store instance
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'persist/PERSIST',
          `${baseApi.reducerPath}/executeMutation`,
          `${baseApi.reducerPath}/executeQuery`,
          'websocket/messageReceived',
          'websocket/messageSent',
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates', 'websocket.messageHistory'],
      },
    })
      .concat(baseApi.middleware)
      .concat(websocketMiddleware)
      .concat(...customMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// Enable listener behavior for RTK Query
setupListeners(store.dispatch);

// Infer types from store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;

// Factory function for tests
export const createStore = (preloadedState?: Partial<RootState>) =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [
            'persist/PERSIST',
            `${baseApi.reducerPath}/executeMutation`,
            `${baseApi.reducerPath}/executeQuery`,
            'websocket/messageReceived',
            'websocket/messageSent',
          ],
          ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
          ignoredPaths: ['items.dates', 'websocket.messageHistory'],
        },
      })
        .concat(baseApi.middleware)
        .concat(websocketMiddleware)
        .concat(...customMiddleware),
    preloadedState,
    devTools: process.env.NODE_ENV !== 'production',
  });

// Re-export the properly typed createStore
export const createStoreWithPreloadedState = (preloadedState?: Partial<RootState>) =>
  createStore(preloadedState);
