/**
 * Root Application Component
 *
 * Responsibilities:
 * - Set up main application routing
 * - Apply global styles and themes
 * - Handle app-level error boundaries
 * - Configure route-based code splitting
 * - Manage authentication routing
 * - Set up layout structure
 * - Initialize app-wide services
 */

import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@app/hooks';
import { selectReadingStatus, play, pause } from '@features/reading/store/readingSlice';
import { ApiDemo } from '@features/reading/components/ApiDemo';
import { ProviderDemo } from '@features/reading/components/ProviderDemo';
import { StateVisualizerShowcase } from './showcases/examples/StateVisualizerShowcase';
import { WebSocketShowcase } from './showcases/WebSocketShowcase';
import { AudioStreamingShowcase } from './showcases/AudioStreamingShowcase';
import { StudentInterruptionShowcase } from './showcases/StudentInterruptionShowcase';
import { ShowcaseSection } from './showcases/components/ShowcaseContainer';

type TabId = 'overview' | 'redux' | 'api' | 'providers' | 'websocket' | 'audio' | 'interruptions' | 'interactive';

const VALID_TABS: TabId[] = ['overview', 'redux', 'api', 'providers', 'websocket', 'audio', 'interruptions', 'interactive'];

function getTabFromHash(): TabId {
  const hash = window.location.hash.slice(1); // Remove the #
  return VALID_TABS.includes(hash as TabId) ? (hash as TabId) : 'overview';
}

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>(getTabFromHash());
  const dispatch = useAppDispatch();
  const readingStatus = useAppSelector(selectReadingStatus);

  // Handle hash changes
  useEffect(() => {
    const handleHashChange = (): void => {
      setActiveTab(getTabFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash when tab changes
  const handleTabChange = (tab: TabId): void => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">ReaderAI Component Showcase</h1>
          <p className="text-sm text-gray-600 mt-1">
            Interactive demos of core functionality - Component-Driven Development in action
          </p>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'overview' as TabId, label: 'Overview' },
              { id: 'redux' as TabId, label: 'Redux Store' },
              { id: 'api' as TabId, label: 'API Integration' },
              { id: 'providers' as TabId, label: 'Provider System' },
              { id: 'websocket' as TabId, label: 'WebSocket' },
              { id: 'audio' as TabId, label: 'Audio Streaming' },
              { id: 'interruptions' as TabId, label: 'Student Questions' },
              { id: 'interactive' as TabId, label: 'Interactive Demos' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <ShowcaseSection
              title="Welcome to ReaderAI Frontend"
              description="A modern React application built with Redux Toolkit, TypeScript, and Component-Driven Development"
            >
              <div className="prose max-w-none">
                <p className="text-gray-700">
                  This showcase demonstrates all the core functionality of our reading application.
                  Each tab showcases different aspects of the architecture, allowing you to interact
                  with and understand each system in isolation.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">🏗️ Architecture</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Redux Toolkit for state management</li>
                      <li>• RTK Query for data fetching</li>
                      <li>• Provider pattern for services</li>
                      <li>• TypeScript for type safety</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">✨ Features</h3>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Real-time WebSocket communication</li>
                      <li>• Swappable provider implementations</li>
                      <li>• Mock Service Worker for API testing</li>
                      <li>• Component showcase pattern</li>
                    </ul>
                  </div>
                </div>
              </div>
            </ShowcaseSection>

            <ShowcaseSection
              title="Development Status"
              description="Current implementation progress"
            >
              <div className="space-y-2">
                {[
                  { feature: 'Redux Store & Provider Setup', status: 'completed' },
                  { feature: 'Base API Configuration', status: 'completed' },
                  { feature: 'Demo Providers', status: 'completed' },
                  { feature: 'WebSocket Integration', status: 'completed' },
                  { feature: 'Audio Streaming Infrastructure', status: 'completed' },
                  { feature: 'Reading UI Components', status: 'in-progress' },
                ].map(item => (
                  <div key={item.feature} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="font-medium">{item.feature}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === 'completed' ? 'bg-green-100 text-green-800' :
                      item.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </ShowcaseSection>
          </div>
        )}

        {activeTab === 'redux' && (
          <div className="space-y-8">
            <ShowcaseSection
              title="Redux Store Integration"
              description="Demonstrates Redux Toolkit store setup, typed hooks, and basic state management"
            >
              <div className="space-y-4">
                <div className="p-4 bg-gray-100 rounded-lg">
                  <h3 className="font-semibold mb-2">Current State</h3>
                  <pre className="text-sm bg-white p-3 rounded border border-gray-200">
                    {JSON.stringify({ readingStatus }, null, 2)}
                  </pre>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => dispatch(play())}
                    disabled={readingStatus === 'playing'}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Play
                  </button>
                  <button
                    onClick={() => dispatch(pause())}
                    disabled={readingStatus !== 'playing'}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Pause
                  </button>
                </div>

                <div className="text-sm text-gray-600">
                  <p>✓ Redux DevTools integration enabled</p>
                  <p>✓ Type-safe hooks (useAppDispatch, useAppSelector)</p>
                  <p>✓ Hot module replacement preserves state</p>
                </div>
              </div>
            </ShowcaseSection>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-8">
            <ShowcaseSection
              title="RTK Query API Integration"
              description="Shows data fetching, caching, loading states, and error handling"
            >
              <ApiDemo />
            </ShowcaseSection>
          </div>
        )}

        {activeTab === 'providers' && (
          <div className="space-y-8">
            <ShowcaseSection
              title="Provider System"
              description="Demonstrates swappable provider architecture for TTS, audio, and session management"
            >
              <ProviderDemo />
            </ShowcaseSection>
          </div>
        )}

        {activeTab === 'websocket' && (
          <WebSocketShowcase />
        )}

        {activeTab === 'audio' && (
          <AudioStreamingShowcase />
        )}

        {activeTab === 'interruptions' && (
          <StudentInterruptionShowcase />
        )}

        {activeTab === 'interactive' && (
          <div className="space-y-8">
            <ShowcaseSection
              title="Interactive Demos"
              description="Explore interactive examples of complex state management and UI patterns"
            >
              <StateVisualizerShowcase />
            </ShowcaseSection>

            <ShowcaseSection
              title="More Demos Coming Soon"
              description="Future interactive showcases will include:"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: 'Word Highlighting Demo', desc: 'Synchronized highlighting with audio playback' },
                  { title: 'Interruption Flow', desc: 'Handle student questions during reading' },
                  { title: 'Checkpoint System', desc: 'Quiz questions and progress tracking' },
                  { title: 'Audio Streaming', desc: 'Buffering and playback visualization' },
                  { title: 'Offline Mode', desc: 'Service worker and cache management' },
                  { title: 'Performance Metrics', desc: 'Bundle size and render optimization' },
                ].map(demo => (
                  <div key={demo.title} className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900">{demo.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{demo.desc}</p>
                  </div>
                ))}
              </div>
            </ShowcaseSection>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
