/**
 * Student Interruption Showcase
 *
 * Demonstrates the real-time WebSocket-based student interruption flow
 */

import React, { useState, useEffect } from 'react';
import { ShowcaseSection } from './components/ShowcaseContainer';
import { StudentInterruption } from '@features/reading/components/StudentInterruption';
import { useStudentInterruption } from '@features/reading/hooks/useStudentInterruption';
import { selectIsConnected } from '@features/websocket/websocketSlice';
import { useAppSelector } from '@app/hooks';

// Sample text for demonstration
const SAMPLE_TEXT = `The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet at least once. It has been used since the late 1800s to test typewriters and computer keyboards. The phrase is short, memorable, and includes a variety of letter combinations that make it useful for testing purposes.`;

const SAMPLE_WORDS = SAMPLE_TEXT.split(' ');

export function StudentInterruptionShowcase(): React.JSX.Element {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [readingSpeed, setReadingSpeed] = useState(150); // words per minute
  const wsConnected = useAppSelector(selectIsConnected);

  // Get current sentence and surrounding text
  const getCurrentContext = (): { sentence: string; surrounding: string } => {
    const words = SAMPLE_TEXT.split(' ');
    let sentenceStart = currentWordIndex;
    let sentenceEnd = currentWordIndex;

    // Find sentence boundaries
    for (let i = currentWordIndex; i >= 0; i--) {
      if (i === 0 || words[i - 1]?.includes('.')) {
        sentenceStart = i;
        break;
      }
    }

    for (let i = currentWordIndex; i < words.length; i++) {
      if (words[i]?.includes('.')) {
        sentenceEnd = i + 1;
        break;
      }
    }

    const sentence = words.slice(sentenceStart, sentenceEnd).join(' ');
    const surroundingStart = Math.max(0, sentenceStart - 10);
    const surroundingEnd = Math.min(words.length, sentenceEnd + 10);
    const surrounding = words.slice(surroundingStart, surroundingEnd).join(' ');

    return { sentence, surrounding };
  };

  const { sentence: currentSentence, surrounding: surroundingText } = getCurrentContext();

  // Mock audio player for demo
  const mockAudioPlayer = {
    isPlaying: () => isReading,
    pause: () => setIsReading(false),
    play: () => setIsReading(true),
    getCurrentTime: () => (currentWordIndex / SAMPLE_WORDS.length) * 60, // Mock time in seconds
  };

  const {
    interruption,
    isConnected,
    askQuestion,
    resumeReading,
    repeatAudio,
    clearInterruption,
  } = useStudentInterruption({
    audioPlayer: mockAudioPlayer as any,
    currentWordIndex,
    currentSentence,
    surroundingText,
    onInterruptionStart: () => setIsReading(false),
    onInterruptionEnd: () => setIsReading(true),
  });

  // Simulate reading progress
  useEffect(() => {
    if (!isReading || interruption.isActive) return;

    const msPerWord = (60 * 1000) / readingSpeed;
    const interval = setInterval(() => {
      setCurrentWordIndex(prev => {
        if (prev >= SAMPLE_WORDS.length - 1) {
          setIsReading(false);
          return prev;
        }
        return prev + 1;
      });
    }, msPerWord);

    return () => clearInterval(interval);
  }, [isReading, readingSpeed, interruption.isActive]);

  // Handle repeat audio
  const handleRepeat = (fromWordIndex: number): void => {
    setCurrentWordIndex(fromWordIndex);
    repeatAudio(fromWordIndex);
    setIsReading(true);
  };

  return (
    <div className="space-y-8">
      <ShowcaseSection
        title="Student Interruption Demo"
        description="Real-time WebSocket communication for student questions during reading"
      >
        {/* Connection Status */}
        <div className="mb-6 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            WebSocket: {wsConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Reading Text Display */}
        <div className="p-6 bg-gray-50 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-3">Reading Text</h3>
          <p className="text-lg leading-relaxed">
            {SAMPLE_WORDS.map((word, index) => (
              <span
                key={index}
                className={`
                  ${index === currentWordIndex ? 'bg-yellow-300 font-bold' : ''}
                  ${index < currentWordIndex ? 'text-gray-600' : 'text-gray-900'}
                `}
              >
                {word}{' '}
              </span>
            ))}
          </p>
        </div>

        {/* Reading Controls */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setIsReading(!isReading)}
            disabled={interruption.isActive}
            className="px-4 py-2 bg-green-600 text-white rounded-md
                     hover:bg-green-700 disabled:bg-gray-400
                     disabled:cursor-not-allowed transition-colors"
          >
            {isReading ? '⏸ Pause' : '▶ Play'}
          </button>

          <button
            onClick={() => setCurrentWordIndex(0)}
            className="px-4 py-2 bg-gray-600 text-white rounded-md
                     hover:bg-gray-700 transition-colors"
          >
            ⏮ Restart
          </button>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Speed:</label>
            <input
              type="range"
              min="50"
              max="300"
              value={readingSpeed}
              onChange={(e) => setReadingSpeed(Number(e.target.value))}
              className="w-32"
            />
            <span className="text-sm text-gray-600">{readingSpeed} WPM</span>
          </div>
        </div>

        {/* Student Interruption Component */}
        <StudentInterruption
          interruption={interruption}
          isConnected={isConnected}
          onAskQuestion={askQuestion}
          onResume={resumeReading}
          onRepeat={handleRepeat}
        />

        {/* Debug Info */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h4 className="font-semibold mb-2">Debug Info</h4>
          <div className="text-sm space-y-1">
            <p>Current Word Index: {currentWordIndex}</p>
            <p>Current Sentence: "{currentSentence}"</p>
            <p>Reading Active: {isReading ? 'Yes' : 'No'}</p>
            <p>Interruption Active: {interruption.isActive ? 'Yes' : 'No'}</p>
            <p>Processing: {interruption.isProcessing ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="Message Flow"
        description="WebSocket messages exchanged during interruptions"
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">Client → Server</h4>
            <pre className="text-sm overflow-x-auto">
{`{
  type: 'STUDENT_INTERRUPTION',
  payload: {
    questionText: "What does 'pangram' mean?",
    context: {
      currentWordIndex: 15,
      currentSentence: "This pangram contains...",
      surroundingText: "...brown fox jumps...",
      audioTimestamp: 6.5
    }
  }
}`}
            </pre>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold mb-2">Server → Client</h4>
            <pre className="text-sm overflow-x-auto">
{`{
  type: 'INTERRUPTION_RESPONSE',
  payload: {
    responseText: "A pangram is a sentence that...",
    responseType: 'definition',
    structuredData: {
      word: 'pangram',
      definition: 'A sentence containing all letters',
      examples: ['The quick brown fox...']
    }
  }
}`}
            </pre>
          </div>
        </div>
      </ShowcaseSection>
    </div>
  );
}
