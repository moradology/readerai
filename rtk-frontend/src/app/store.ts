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
import { baseApi } from '@shared/api/baseApi';

// Custom middleware will be imported here
import { customMiddleware } from './middleware';

// Define the root reducer
const rootReducer = {
  reading: readingReducer,
  [baseApi.reducerPath]: baseApi.reducer,
};

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
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates'],
      },
    })
      .concat(baseApi.middleware)
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
          ],
          ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
          ignoredPaths: ['items.dates'],
        },
      })
        .concat(baseApi.middleware)
        .concat(...customMiddleware),
    preloadedState,
    devTools: process.env.NODE_ENV !== 'production',
  });

// Re-export the properly typed createStore
export const createStoreWithPreloadedState = (preloadedState?: Partial<RootState>) =>
  createStore(preloadedState);
