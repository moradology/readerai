/**
 * Reading Controls Showcase
 *
 * Demonstrates the ReadingControls component in various states
 * and configurations for development and testing.
 */

import React, { useState, useEffect } from 'react';
import { ShowcaseContainer, ShowcaseSection } from './components/ShowcaseContainer';
import { ReadingControls } from '@features/reading/components/ReadingControls';

export function ReadingControlsShowcase(): React.JSX.Element {
  // State for interactive demo
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);

  const duration = 300; // 5 minutes

  // Simulate playback
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + 0.1 * playbackRate;
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackRate]);

  return (
    <ShowcaseContainer
      title="Reading Controls Component"
      description="Unified playback controls for audio/text synchronization"
    >
      {/* Interactive Demo */}
      <ShowcaseSection
        title="Interactive Demo"
        description="Fully functional controls with simulated playback"
      >
        <ReadingControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          playbackRate={playbackRate}
          volume={volume}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onSeek={setCurrentTime}
          onPlaybackRateChange={setPlaybackRate}
          onVolumeChange={setVolume}
          onRestart={() => {
            setCurrentTime(0);
            setIsPlaying(false);
          }}
        />

        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">Current State:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Playing: {isPlaying ? 'Yes' : 'No'}</div>
            <div>Time: {Math.floor(currentTime)}s / {duration}s</div>
            <div>Speed: {playbackRate}x</div>
            <div>Volume: {Math.round(volume * 100)}%</div>
          </div>
        </div>
      </ShowcaseSection>

      {/* Different States */}
      <ShowcaseSection
        title="Component States"
        description="Various loading and playback states"
      >
        <div className="space-y-6">
          {/* Loading State */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Loading State</h4>
            <p className="text-sm text-gray-600 mb-3">
              All controls disabled, no duration available
            </p>
            <ReadingControls
              isPlaying={false}
              isLoading={true}
              currentTime={0}
              duration={0}
              playbackRate={1}
              volume={1}
              onPlayPause={() => {}}
              onSeek={() => {}}
              onPlaybackRateChange={() => {}}
              onVolumeChange={() => {}}
            />
          </div>

          {/* Buffering State */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Buffering State</h4>
            <p className="text-sm text-gray-600 mb-3">
              Shows spinner in play button, playback paused
            </p>
            <ReadingControls
              isPlaying={true}
              isBuffering={true}
              currentTime={45}
              duration={300}
              playbackRate={1.25}
              volume={0.7}
              onPlayPause={() => {}}
              onSeek={() => {}}
              onPlaybackRateChange={() => {}}
              onVolumeChange={() => {}}
            />
          </div>

          {/* Completed State */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Completed State</h4>
            <p className="text-sm text-gray-600 mb-3">
              Playback finished, at end of content
            </p>
            <ReadingControls
              isPlaying={false}
              currentTime={300}
              duration={300}
              playbackRate={1}
              volume={1}
              onPlayPause={() => {}}
              onSeek={() => {}}
              onPlaybackRateChange={() => {}}
              onVolumeChange={() => {}}
              onRestart={() => {}}
            />
          </div>
        </div>
      </ShowcaseSection>

      {/* Configuration Options */}
      <ShowcaseSection
        title="Configuration Options"
        description="Different control configurations"
      >
        <div className="space-y-6">
          {/* Minimal Controls */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Minimal Controls</h4>
            <p className="text-sm text-gray-600 mb-3">
              No speed or volume controls, just playback and progress
            </p>
            <ReadingControls
              isPlaying={false}
              currentTime={120}
              duration={300}
              playbackRate={1}
              volume={1}
              showSpeedControl={false}
              showVolumeControl={false}
              onPlayPause={() => {}}
              onSeek={() => {}}
              onPlaybackRateChange={() => {}}
              onVolumeChange={() => {}}
            />
          </div>

          {/* No Volume Control */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Speed Control Only</h4>
            <p className="text-sm text-gray-600 mb-3">
              For scenarios where volume is controlled elsewhere
            </p>
            <ReadingControls
              isPlaying={true}
              currentTime={90}
              duration={300}
              playbackRate={1.5}
              volume={1}
              showVolumeControl={false}
              onPlayPause={() => {}}
              onSeek={() => {}}
              onPlaybackRateChange={() => {}}
              onVolumeChange={() => {}}
            />
          </div>

          {/* Custom Speed Options */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Custom Speed Options</h4>
            <p className="text-sm text-gray-600 mb-3">
              Limited speed options for simplified experience
            </p>
            <ReadingControls
              isPlaying={false}
              currentTime={30}
              duration={300}
              playbackRate={1}
              volume={0.8}
              availableSpeeds={[0.75, 1, 1.25, 1.5]}
              onPlayPause={() => {}}
              onSeek={() => {}}
              onPlaybackRateChange={() => {}}
              onVolumeChange={() => {}}
            />
          </div>
        </div>
      </ShowcaseSection>

      {/* Edge Cases */}
      <ShowcaseSection
        title="Edge Cases"
        description="Handling unusual scenarios"
      >
        <div className="space-y-6">
          {/* Very Long Duration */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Long Duration</h4>
            <p className="text-sm text-gray-600 mb-3">
              Handles hour+ durations gracefully
            </p>
            <ReadingControls
              isPlaying={false}
              currentTime={3665} // 1:01:05
              duration={7200} // 2 hours
              playbackRate={1}
              volume={1}
              onPlayPause={() => {}}
              onSeek={() => {}}
              onPlaybackRateChange={() => {}}
              onVolumeChange={() => {}}
            />
          </div>

          {/* Zero Duration */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Unknown Duration</h4>
            <p className="text-sm text-gray-600 mb-3">
              Before metadata is loaded
            </p>
            <ReadingControls
              isPlaying={false}
              currentTime={0}
              duration={0}
              playbackRate={1}
              volume={1}
              onPlayPause={() => {}}
              onSeek={() => {}}
              onPlaybackRateChange={() => {}}
              onVolumeChange={() => {}}
            />
          </div>

          {/* Muted State */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Muted Audio</h4>
            <p className="text-sm text-gray-600 mb-3">
              Volume at 0, shows muted icon
            </p>
            <ReadingControls
              isPlaying={true}
              currentTime={150}
              duration={300}
              playbackRate={1}
              volume={0}
              onPlayPause={() => {}}
              onSeek={() => {}}
              onPlaybackRateChange={() => {}}
              onVolumeChange={() => {}}
            />
          </div>
        </div>
      </ShowcaseSection>

      {/* Features */}
      <ShowcaseSection
        title="Component Features"
        description="Key capabilities and behaviors"
      >
        <div className="bg-white p-6 rounded-lg">
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <div>
                <strong>Responsive Design:</strong> Adapts to container width, mobile-friendly
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <div>
                <strong>Accessibility:</strong> Full keyboard navigation, ARIA labels, focus states
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <div>
                <strong>Visual Feedback:</strong> Hover states, disabled states, active indicators
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <div>
                <strong>Quick Controls:</strong> Speed preset buttons for common rates
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <div>
                <strong>Smooth Progress:</strong> CSS transitions for progress bar updates
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <div>
                <strong>State Indicators:</strong> Loading spinner, mute icon, time formatting
              </div>
            </li>
          </ul>
        </div>
      </ShowcaseSection>

      {/* Usage Example */}
      <ShowcaseSection
        title="Usage Example"
        description="How to integrate ReadingControls in your components"
      >
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
          <code>{`import { ReadingControls } from '@features/reading/components/ReadingControls';

function MyReadingComponent() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);

  return (
    <ReadingControls
      isPlaying={isPlaying}
      currentTime={currentTime}
      duration={audioPlayer.duration}
      playbackRate={playbackRate}
      volume={volume}
      onPlayPause={() => {
        if (isPlaying) {
          audioPlayer.pause();
        } else {
          audioPlayer.play();
        }
        setIsPlaying(!isPlaying);
      }}
      onSeek={(time) => {
        audioPlayer.seek(time);
        setCurrentTime(time);
      }}
      onPlaybackRateChange={(rate) => {
        audioPlayer.setPlaybackRate(rate);
        setPlaybackRate(rate);
      }}
      onVolumeChange={(vol) => {
        audioPlayer.setVolume(vol);
        setVolume(vol);
      }}
      onRestart={() => {
        audioPlayer.seek(0);
        setCurrentTime(0);
        setIsPlaying(false);
      }}
    />
  );
}`}</code>
        </pre>
      </ShowcaseSection>
    </ShowcaseContainer>
  );
}
