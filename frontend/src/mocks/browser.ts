/**
 * MSW Browser Worker Setup
 *
 * Configures Mock Service Worker for browser environments
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { websocketHandlers } from './websocketHandlers';

// Create the worker instance with both HTTP and WebSocket handlers
export const worker = setupWorker(...handlers, ...websocketHandlers);

// Start options
export const workerOptions = {
  onUnhandledRequest: 'bypass' as const,
  quiet: false,
};
