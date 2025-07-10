/**
 * RTK Query Base API Configuration
 *
 * Responsibilities:
 * - Configure base RTK Query API instance
 * - Set up base query with authentication
 * - Configure global error handling
 * - Implement request/response interceptors
 * - Handle token refresh logic
 * - Set up tag types for cache invalidation
 * - Configure development tools integration
 */

import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { Mutex } from 'async-mutex';
import { getAccessToken, setAccessToken } from './client';
import type { ApiError } from './types';

// Create a mutex for token refresh
const mutex = new Mutex();

// Base query with auth
const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  credentials: 'include', // Include cookies
  prepareHeaders: (headers) => {
    const token = getAccessToken();
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
  timeout: 30000, // 30 seconds
});

// Base query with automatic retry
const baseQueryWithRetry = retry(baseQuery, { maxRetries: 3 });

// Base query with re-authentication
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Wait until the mutex is available
  await mutex.waitForUnlock();

  let result = await baseQueryWithRetry(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Check if another instance is already refreshing
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        // Try to refresh the token
        const refreshResult = await baseQuery(
          { url: '/auth/refresh', method: 'POST' },
          api,
          extraOptions
        );

        if (refreshResult.data) {
          // Store the new token
          const { accessToken } = refreshResult.data as { accessToken: string };
          setAccessToken(accessToken);

          // Retry the original query
          result = await baseQueryWithRetry(args, api, extraOptions);
        } else {
          // Refresh failed, clear token and redirect
          setAccessToken(null);
          window.location.href = '/login';
        }
      } finally {
        release();
      }
    } else {
      // Wait for the mutex to be released and retry
      await mutex.waitForUnlock();
      result = await baseQueryWithRetry(args, api, extraOptions);
    }
  }

  // Log in development
  if (import.meta.env.DEV && import.meta.env.VITE_LOG_LEVEL === 'debug') {
    console.log('[RTK Query]', {
      endpoint: args,
      result: result.data,
      error: result.error,
    });
  }

  return result;
};

// Define tag types for cache invalidation
export const tagTypes = [
  'User',
  'Passage',
  'ReadingSession',
  'Checkpoint',
  'Interruption',
  'Progress',
  'Analytics',
] as const;

// Create the base API
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes,
  endpoints: () => ({}), // Endpoints will be injected by feature APIs
  // Global error handling
  // Note: Individual endpoints can override this
});

// Export hooks for usage in functional components
export const {
  util: { getRunningQueriesThunk, invalidateTags },
} = baseApi;

// Export types
export type TagType = typeof tagTypes[number];

// Helper to transform errors
export function transformErrorResponse(error: FetchBaseQueryError): ApiError {
  if ('data' in error) {
    return error.data as ApiError;
  }

  return {
    error: {
      code: 'NETWORK_ERROR',
      message: 'status' in error ? `Network error: ${error.status}` : 'Network error occurred',
      timestamp: new Date().toISOString(),
    },
    status: 'status' in error ? Number(error.status) : 0,
  };
}

// Re-export everything
export * from '@reduxjs/toolkit/query/react';
