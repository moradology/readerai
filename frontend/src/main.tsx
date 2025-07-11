/**
 * Application Entry Point
 *
 * Responsibilities:
 * - Bootstrap the React application
 * - Set up React.StrictMode for development
 * - Configure and provide Redux store
 * - Initialize error tracking/monitoring
 * - Set up MSW for development mocking
 * - Handle environment-specific setup
 * - Mount app to DOM root element
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from '@app/providers';
import App from './App';
import './styles/globals.css';

// Initialize app
async function initializeApp() {
  // Initialize MSW for development
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK_API === 'true') {
    console.log('🔧 Initializing Mock Service Worker...');
    const { worker, workerOptions } = await import('./mocks/browser');
    await worker.start(workerOptions);
    console.log('✅ Mock Service Worker initialized');
  }

  // Get root element
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Failed to find the root element');
  }

  // Create root and render app
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </React.StrictMode>
  );
}

// Start the app
initializeApp().catch(console.error);
