import React, { useState, useEffect } from 'react';
import { ShowcaseContainer } from './components/ShowcaseContainer';
import { ReadingView } from '../features/reading/components/ReadingView';

/**
 * Showcase for the ReadingView component demonstrating:
 * - Word-by-word highlighting synchronized with time
 * - Click-to-jump functionality
 * - Past/active word styling
 * - Auto-scrolling behavior
 */
export const ReadingViewShowcase: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Sample passage with word timings
  const passage = `The ethereal glow of dawn crept through the ancient forest, painting shadows that danced between towering oaks. Birds began their morning symphony, each note cascading through the misty air. A deer paused at the crystal stream, its reflection shimmering in the gentle current.`;

  const wordTimings = [
    { word: "The", start: 0.0, end: 0.3 },
    { word: "ethereal", start: 0.3, end: 0.9 },
    { word: "glow", start: 0.9, end: 1.3 },
    { word: "of", start: 1.3, end: 1.5 },
    { word: "dawn", start: 1.5, end: 1.9 },
    { word: "crept", start: 1.9, end: 2.3 },
    { word: "through", start: 2.3, end: 2.7 },
    { word: "the", start: 2.7, end: 2.9 },
    { word: "ancient", start: 2.9, end: 3.4 },
    { word: "forest,", start: 3.4, end: 4.0 },
    { word: "painting", start: 4.2, end: 4.7 },
    { word: "shadows", start: 4.7, end: 5.2 },
    { word: "that", start: 5.2, end: 5.4 },
    { word: "danced", start: 5.4, end: 5.9 },
    { word: "between", start: 5.9, end: 6.3 },
    { word: "towering", start: 6.3, end: 6.8 },
    { word: "oaks.", start: 6.8, end: 7.3 },
    { word: "Birds", start: 7.8, end: 8.2 },
    { word: "began", start: 8.2, end: 8.6 },
    { word: "their", start: 8.6, end: 8.9 },
    { word: "morning", start: 8.9, end: 9.4 },
    { word: "symphony,", start: 9.4, end: 10.0 },
    { word: "each", start: 10.2, end: 10.5 },
    { word: "note", start: 10.5, end: 10.9 },
    { word: "cascading", start: 10.9, end: 11.5 },
    { word: "through", start: 11.5, end: 11.9 },
    { word: "the", start: 11.9, end: 12.1 },
    { word: "misty", start: 12.1, end: 12.5 },
    { word: "air.", start: 12.5, end: 13.0 },
    { word: "A", start: 13.5, end: 13.7 },
    { word: "deer", start: 13.7, end: 14.0 },
    { word: "paused", start: 14.0, end: 14.5 },
    { word: "at", start: 14.5, end: 14.7 },
    { word: "the", start: 14.7, end: 14.9 },
    { word: "crystal", start: 14.9, end: 15.4 },
    { word: "stream,", start: 15.4, end: 15.9 },
    { word: "its", start: 16.1, end: 16.3 },
    { word: "reflection", start: 16.3, end: 16.9 },
    { word: "shimmering", start: 16.9, end: 17.5 },
    { word: "in", start: 17.5, end: 17.7 },
    { word: "the", start: 17.7, end: 17.9 },
    { word: "gentle", start: 17.9, end: 18.3 },
    { word: "current.", start: 18.3, end: 19.0 },
  ];

  const maxTime = wordTimings[wordTimings.length - 1].end;

  // Simulate playback
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.1 * playbackSpeed;
        if (next > maxTime) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, maxTime]);

  const handleWordClick = (wordIndex: number, startTime: number) => {
    console.log(`Clicked word ${wordIndex} at time ${startTime}`);
    setCurrentTime(startTime);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <ShowcaseContainer
      title="Reading View"
      description="Interactive reading display with word-by-word highlighting and navigation"
    >
      {/* Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <div className="flex gap-4 mb-6 items-center">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors min-w-[100px]"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            onClick={() => {
              setCurrentTime(0);
              setIsPlaying(false);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>

          <span className="ml-auto text-gray-600">
            {formatTime(currentTime)} / {formatTime(maxTime)}
          </span>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Playback Position
          </label>
          <input
            type="range"
            value={currentTime}
            onChange={(e) => {
              setCurrentTime(Number(e.target.value));
              setIsPlaying(false);
            }}
            min={0}
            max={maxTime}
            step={0.1}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Speed: {playbackSpeed}x
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              min={0.5}
              max={2}
              step={0.25}
              className="flex-1"
            />
            <div className="flex gap-2 text-sm text-gray-500">
              <span>0.5x</span>
              <span>|</span>
              <span>2x</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reading View */}
      <ReadingView
        text={passage}
        wordTimings={wordTimings}
        currentTime={currentTime}
        isPlaying={isPlaying}
        onWordClick={handleWordClick}
      />

      {/* Features */}
      <div className="bg-white p-6 rounded-lg shadow-sm mt-6">
        <h3 className="text-lg font-semibold mb-4">Features Demonstrated</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Word-by-word highlighting synchronized with playback time</li>
          <li>Click any word to jump to that position</li>
          <li>Past words shown with subtle background</li>
          <li>Active word highlighted and slightly scaled</li>
          <li>Auto-scrolling to keep current word in view</li>
          <li>Keyboard navigation support (Tab + Enter/Space)</li>
          <li>Responsive design with proper text wrapping</li>
          <li>Smooth transitions between words</li>
        </ul>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 p-6 rounded-lg mt-6">
        <h3 className="text-lg font-semibold mb-4">Try It Out</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Click "Play" to start the simulated reading</li>
          <li>Adjust the speed slider to change playback rate</li>
          <li>Click any word to jump to that position</li>
          <li>Use the position slider to scrub through the text</li>
          <li>Watch how the view auto-scrolls to keep the active word visible</li>
          <li>Try keyboard navigation: Tab to a word, then Enter/Space to jump</li>
        </ol>
      </div>
    </ShowcaseContainer>
  );
};
