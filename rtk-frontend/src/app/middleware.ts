/**
 * Custom Redux Middleware
 *
 * Responsibilities:
 * - Define custom middleware for cross-cutting concerns
 * - Handle global error logging and reporting
 * - Implement action logging in development
 * - Handle authentication token refresh
 * - Coordinate WebSocket connections with Redux actions
 * - Performance monitoring and analytics tracking
 */

import type { Middleware } from '@reduxjs/toolkit';

/**
 * Error logging middleware
 * Catches and logs errors from rejected actions
 */
export const errorLoggingMiddleware: Middleware =
  (_storeApi) => (next) => (action: any) => {
    // Pass action through first
    const result = next(action);

    // Check for rejected actions
    if (action.type?.endsWith('/rejected')) {
      console.error('Action failed:', {
        type: action.type,
        error: action.error,
        payload: action.payload,
      });

      // In production, send to error tracking service
      if (process.env.NODE_ENV === 'production') {
        // TODO: Send to Sentry, LogRocket, etc.
      }
    }

    return result;
  };

/**
 * Development logging middleware
 * Logs all actions and state changes in development
 */
export const actionLoggingMiddleware: Middleware =
  (storeApi) => (next) => (action: any) => {
    if (process.env.NODE_ENV === 'development' && import.meta.env.VITE_LOG_LEVEL === 'debug') {
      console.group(`[Redux] ${action.type}`);
      console.log('Previous State:', storeApi.getState());
      console.log('Action:', action);
    }

    const result = next(action);

    if (process.env.NODE_ENV === 'development' && import.meta.env.VITE_LOG_LEVEL === 'debug') {
      console.log('Next State:', storeApi.getState());
      console.groupEnd();
    }

    return result;
  };

/**
 * Analytics middleware
 * Tracks user actions for analytics
 */
export const analyticsMiddleware: Middleware =
  (_storeApi) => (next) => (action: any) => {
    const result = next(action);

    // Track specific actions
    if (import.meta.env.VITE_FEATURE_ANALYTICS === 'true') {
      const trackableActions = [
        'reading/startSession',
        'reading/pauseSession',
        'reading/resumeSession',
        'reading/completeSession',
        'interruption/create',
        'checkpoint/answer',
      ];

      if (trackableActions.some(prefix => action.type.startsWith(prefix))) {
        // TODO: Send to analytics service
        console.log('[Analytics] Track event:', action.type);
      }
    }

    return result;
  };

/**
 * WebSocket coordination middleware
 * Handles WebSocket connection lifecycle based on Redux actions
 */
export const websocketMiddleware: Middleware =
  (_storeApi) => (next) => (action: any) => {
    const result = next(action);

    // Handle WebSocket-related actions
    switch (action.type) {
      case 'auth/loginSuccess':
        // TODO: Initialize WebSocket connection
        console.log('[WebSocket] Should initialize connection');
        break;

      case 'auth/logout':
        // TODO: Close WebSocket connection
        console.log('[WebSocket] Should close connection');
        break;

      case 'reading/startSession':
        // TODO: Send session start message
        console.log('[WebSocket] Should send session start');
        break;
    }

    return result;
  };

/**
 * Combines all custom middleware
 */
export const customMiddleware: Middleware[] = [
  errorLoggingMiddleware,
  ...(process.env.NODE_ENV === 'development' ? [actionLoggingMiddleware] : []),
  ...(import.meta.env.VITE_FEATURE_ANALYTICS === 'true' ? [analyticsMiddleware] : []),
  websocketMiddleware,
];
