/**
 * Test Environment Setup
 *
 * Responsibilities:
 * - Configure testing environment
 * - Set up global test utilities
 * - Initialize MSW for API mocking
 * - Configure Testing Library settings
 * - Mock browser APIs (localStorage, etc.)
 * - Set up global test fixtures
 * - Configure test timeouts and retries
 *
 * Key Behaviors to Support:
 * - Tests should run in isolation without side effects
 * - Browser APIs should behave consistently across test runs
 * - Network requests should be intercepted and mocked
 * - Timers and animations should be controllable
 * - Cleanup should happen automatically after each test
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
// Import MSW server when we add handlers
// import { server } from './mocks/server';

// Cleanup after each test case
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

// MSW Setup (commented out until we add handlers)
// beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
// afterEach(() => server.resetHandlers());
// afterAll(() => server.close());

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '0px',
  thresholds: [0],
  takeRecords: () => [],
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Web Audio API
window.AudioContext = vi.fn().mockImplementation(() => ({
  createBufferSource: vi.fn(),
  createGain: vi.fn(),
  createAnalyser: vi.fn(),
  decodeAudioData: vi.fn(),
  destination: {},
  currentTime: 0,
  state: 'running',
  close: vi.fn(),
  resume: vi.fn(),
  suspend: vi.fn(),
}));

// Mock HTMLMediaElement play method
HTMLMediaElement.prototype.play = vi.fn().mockImplementation(() => Promise.resolve());
HTMLMediaElement.prototype.pause = vi.fn();
HTMLMediaElement.prototype.load = vi.fn();

// Add custom matchers if needed
// expect.extend({
//   toBeWithinRange(received, floor, ceiling) {
//     const pass = received >= floor && received <= ceiling;
//     return {
//       pass,
//       message: () =>
//         `expected ${received} ${pass ? 'not ' : ''}to be within range ${floor} - ${ceiling}`,
//     };
//   },
// });

// Set up global test configuration
beforeAll(() => {
  // Suppress console errors in tests unless explicitly testing error handling
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
