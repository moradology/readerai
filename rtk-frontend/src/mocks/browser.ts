/**
 * MSW Browser Worker Setup
 *
 * Configures Mock Service Worker for browser environments
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Create the worker instance
export const worker = setupWorker(...handlers);

// Start options
export const workerOptions = {
  onUnhandledRequest: 'bypass' as const,
  quiet: false,
};
