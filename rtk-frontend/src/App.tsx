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

import { useAppSelector, useAppDispatch } from '@app/hooks';
import { selectReadingStatus, play, pause } from '@features/reading/store/readingSlice';
import { ApiDemo } from '@features/reading/components/ApiDemo';
import { ProviderDemo } from '@features/reading/components/ProviderDemo';

function App() {
  const dispatch = useAppDispatch();
  const readingStatus = useAppSelector(selectReadingStatus);
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'hsl(var(--background))' }}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-4" style={{ color: 'hsl(var(--primary))' }}>
          ReaderAI Frontend
        </h1>
        <p className="text-lg" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Interactive educational reading application
        </p>
        <div className="mt-8 p-6 card">
          <h2 className="text-2xl font-semibold mb-2">Development Setup Complete! 🎉</h2>
          <p style={{ color: 'hsl(var(--muted-foreground))' }}>
            The frontend development environment is ready. Start building by editing files in the <code className="text-sm px-2 py-1 rounded" style={{ backgroundColor: 'hsl(var(--muted))' }}>src</code> directory.
          </p>
          <div className="mt-4 space-y-4">
            <div className="space-x-4">
              <button className="btn-primary">
                Primary Button
              </button>
              <button className="btn-secondary">
                Secondary Button
              </button>
              <button className="btn-ghost">
                Ghost Button
              </button>
            </div>

            <div className="p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--muted))' }}>
              <h3 className="font-semibold mb-2">Redux Store Connected ✅</h3>
              <p className="text-sm mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Reading Status: <span className="font-mono">{readingStatus}</span>
              </p>
              <div className="space-x-2">
                <button
                  onClick={() => dispatch(play())}
                  className="btn-primary text-sm"
                  disabled={readingStatus === 'playing'}
                >
                  Play
                </button>
                <button
                  onClick={() => dispatch(pause())}
                  className="btn-secondary text-sm"
                  disabled={readingStatus !== 'playing'}
                >
                  Pause
                </button>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-semibold mb-2">RTK Query API Demo</h3>
              <ApiDemo />
            </div>

            <div className="mt-4">
              <h3 className="font-semibold mb-2">Provider System Demo</h3>
              <ProviderDemo />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
