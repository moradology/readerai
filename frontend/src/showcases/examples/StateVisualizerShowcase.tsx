/**
 * State Visualizer Showcase
 *
 * Demonstrates how to create interactive showcases that help developers
 * understand state changes and data flow in the application
 */

import { useState, useEffect } from 'react';
import { ShowcaseSection } from '../components/ShowcaseContainer';

interface DemoState {
  counter: number;
  lastAction: string;
  history: string[];
}

export function StateVisualizerShowcase() {
  const [state, setState] = useState<DemoState>({
    counter: 0,
    lastAction: 'initialized',
    history: ['initialized'],
  });

  const [isAutoIncrementing, setIsAutoIncrementing] = useState(false);

  useEffect(() => {
    if (!isAutoIncrementing) return;

    const interval = setInterval(() => {
      setState(prev => ({
        counter: prev.counter + 1,
        lastAction: 'auto-increment',
        history: [...prev.history.slice(-4), 'auto-increment'],
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoIncrementing]);

  const updateState = (action: string, updater: (prev: DemoState) => DemoState) => {
    setState(prev => {
      const newState = updater(prev);
      return {
        ...newState,
        lastAction: action,
        history: [...prev.history.slice(-4), action],
      };
    });
  };

  return (
    <>
      <ShowcaseSection
        title="Interactive State Demo"
        description="Click buttons to see state changes visualized in real-time"
      >
        <div className="grid grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700">Controls</h3>

            <div className="space-x-2">
              <button
                onClick={() => updateState('increment', prev => ({ ...prev, counter: prev.counter + 1 }))}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Increment
              </button>
              <button
                onClick={() => updateState('decrement', prev => ({ ...prev, counter: prev.counter - 1 }))}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Decrement
              </button>
              <button
                onClick={() => updateState('reset', prev => ({ ...prev, counter: 0 }))}
                className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Reset
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-increment"
                checked={isAutoIncrementing}
                onChange={(e) => setIsAutoIncrementing(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="auto-increment" className="text-sm">
                Auto-increment every second
              </label>
            </div>
          </div>

          {/* State Visualization */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700">Current State</h3>

            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="text-3xl font-bold text-center mb-2">
                {state.counter}
              </div>
              <div className="text-sm text-gray-600 text-center">
                Last action: <span className="font-mono">{state.lastAction}</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Action History</h4>
              <div className="space-y-1">
                {state.history.map((action, index) => (
                  <div
                    key={index}
                    className="text-xs font-mono bg-gray-50 px-2 py-1 rounded"
                    style={{ opacity: 1 - (index * 0.2) }}
                  >
                    {action}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="Code Example"
        description="How this showcase helps developers understand state management"
      >
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`// This showcase demonstrates:
// 1. Visual feedback for state changes
// 2. Action history tracking
// 3. Interactive controls
// 4. Real-time updates

const [state, setState] = useState({
  counter: 0,
  lastAction: 'initialized',
  history: ['initialized'],
});

// Update state with action tracking
const updateState = (action, updater) => {
  setState(prev => ({
    ...updater(prev),
    lastAction: action,
    history: [...prev.history, action],
  }));
};`}
        </pre>
      </ShowcaseSection>
    </>
  );
}
