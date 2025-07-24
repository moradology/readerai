import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';

interface Word {
  text: string;
  start: number;
  end: number;
  index: number;
}

interface ReadingViewProps {
  /** The full text to display */
  text: string;
  /** Word-level timing data */
  wordTimings: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  /** Current playback time in seconds */
  currentTime: number;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Callback when a word is clicked */
  onWordClick?: (wordIndex: number, startTime: number) => void;
}

export const ReadingView: React.FC<ReadingViewProps> = ({
  text,
  wordTimings,
  currentTime,
  isPlaying,
  onWordClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);
  const lastScrollTime = useRef<number>(0);

  // Parse text into paragraphs while maintaining word indices
  const paragraphs = useMemo(() => {
    // Split text into paragraphs (double newline or single newline with indentation)
    const paragraphTexts = text.split(/\n\s*\n|\n(?=\s{2,})/);

    let globalWordIndex = 0;
    const wordTimingsByIndex = new Map<number, typeof wordTimings[0]>();

    // Create a map of word timings by index
    wordTimings.forEach((timing, index) => {
      wordTimingsByIndex.set(index, timing);
    });

    return paragraphTexts.map((paragraphText) => {
      // Check if paragraph starts with spaces (indentation)
      const indentMatch = paragraphText.match(/^(\s+)/);
      const indent = indentMatch?.[1]?.length ?? 0;

      // Remove leading spaces for word processing
      const trimmedText = paragraphText.trim();
      if (!trimmedText) return { words: [], indent };

      // Split into words
      const words = trimmedText.split(/\s+/).map((wordText) => {
        const timing = wordTimingsByIndex.get(globalWordIndex);
        const word: Word = {
          text: wordText,
          start: timing?.start ?? -1,
          end: timing?.end ?? -1,
          index: globalWordIndex,
        };
        globalWordIndex++;
        return word;
      });

      return { words, indent };
    }).filter(p => p.words.length > 0);
  }, [text, wordTimings]);

  // Find current active word index based on playback time
  const activeWordIndex = useMemo(() => {
    if (currentTime < 0) return -1;

    for (let i = 0; i < wordTimings.length; i++) {
      const timing = wordTimings[i];
      if (timing && timing.start >= 0 && currentTime >= timing.start && currentTime < timing.end) {
        return i;
      }
    }

    // If we're past all words, return the last word
    if (currentTime > 0 && wordTimings.length > 0) {
      const lastTiming = wordTimings[wordTimings.length - 1];
      if (lastTiming && lastTiming.end !== undefined && currentTime >= lastTiming.end) {
        return wordTimings.length - 1;
      }
    }

    return -1;
  }, [currentTime, wordTimings]);

  // Auto-scroll to keep active word in view
  useEffect(() => {
    if (!isPlaying || !activeWordRef.current || !containerRef.current) return;

    // Throttle scrolling to avoid too frequent updates
    const now = Date.now();
    if (now - lastScrollTime.current < 500) return;
    lastScrollTime.current = now;

    const container = containerRef.current;
    const activeWord = activeWordRef.current;

    const containerRect = container.getBoundingClientRect();
    const wordRect = activeWord.getBoundingClientRect();

    // Check if word is outside visible area
    const isAbove = wordRect.top < containerRect.top + 100; // 100px buffer
    const isBelow = wordRect.bottom > containerRect.bottom - 100;

    if (isAbove || isBelow) {
      // Calculate scroll position to center the active word
      const wordCenter = activeWord.offsetTop + activeWord.offsetHeight / 2;
      const containerCenter = container.offsetHeight / 2;
      const scrollTo = wordCenter - containerCenter;

      container.scrollTo({
        top: Math.max(0, scrollTo),
        behavior: 'smooth',
      });
    }
  }, [activeWordIndex, isPlaying]);

  // Handle word click
  const handleWordClick = useCallback(
    (wordIndex: number) => {
      const timing = wordTimings[wordIndex];
      if (timing && timing.start >= 0 && onWordClick) {
        onWordClick(wordIndex, timing.start);
      }
    },
    [wordTimings, onWordClick]
  );

  return (
    <div
      ref={containerRef}
      className="p-8 max-w-4xl mx-auto bg-white rounded-lg shadow-sm overflow-y-auto scroll-smooth"
      style={{ minHeight: '400px', maxHeight: '600px' }}
    >
      <div className="space-y-4 text-lg leading-relaxed font-serif text-gray-800">
        {paragraphs.map((paragraph, paragraphIndex) => (
          <p
            key={paragraphIndex}
            className="relative"
            style={{ paddingLeft: paragraph.indent ? `${paragraph.indent * 0.5}rem` : 0 }}
          >
            {paragraph.words.map((word, wordIndexInParagraph) => {
              const isActive = word.index === activeWordIndex;
              const isPast = word.index < activeWordIndex;
              const hasTimingData = word.start >= 0;

              return (
                <span key={word.index}>
                  <span
                    ref={isActive ? activeWordRef : undefined}
                    className={clsx(
                      'inline-block px-1 py-0.5 rounded transition-colors duration-300',
                      {
                        // Active word styling - no font weight change or scale
                        'bg-blue-500 text-white ring-2 ring-blue-300': isActive,
                        // Past word styling
                        'bg-gray-100': isPast && !isActive,
                        // Clickable word styling
                        'cursor-pointer hover:bg-gray-200':
                          hasTimingData && !!onWordClick && !isActive,
                        // Default styling
                        'cursor-default': !hasTimingData || !onWordClick,
                      }
                    )}
                    onClick={() => handleWordClick(word.index)}
                    role={hasTimingData && onWordClick ? 'button' : undefined}
                    tabIndex={hasTimingData && onWordClick ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleWordClick(word.index);
                      }
                    }}
                    aria-label={
                      isActive
                        ? `Currently reading: ${word.text}`
                        : hasTimingData && onWordClick
                        ? `Jump to: ${word.text}`
                        : undefined
                    }
                  >
                    {word.text}
                  </span>
                  {wordIndexInParagraph < paragraph.words.length - 1 && ' '}
                </span>
              );
            })}
          </p>
        ))}
      </div>
    </div>
  );
};

// Story/Demo component for Storybook
export const ReadingViewStory: React.FC = () => {
  const [currentTime, setCurrentTime] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);

  // Sample text with paragraphs and indentation
  const text = `The ethereal glow of dawn crept through the ancient forest.

  Birds began their morning symphony, each note cascading through the misty air.

  A deer paused at the crystal stream, its reflection shimmering in the gentle current.`;

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
    { word: "forest.", start: 3.4, end: 4.0 },
    { word: "Birds", start: 4.5, end: 4.9 },
    { word: "began", start: 4.9, end: 5.3 },
    { word: "their", start: 5.3, end: 5.6 },
    { word: "morning", start: 5.6, end: 6.1 },
    { word: "symphony,", start: 6.1, end: 6.7 },
    { word: "each", start: 6.7, end: 7.0 },
    { word: "note", start: 7.0, end: 7.4 },
    { word: "cascading", start: 7.4, end: 8.0 },
    { word: "through", start: 8.0, end: 8.4 },
    { word: "the", start: 8.4, end: 8.6 },
    { word: "misty", start: 8.6, end: 9.0 },
    { word: "air.", start: 9.0, end: 9.5 },
    { word: "A", start: 10.0, end: 10.2 },
    { word: "deer", start: 10.2, end: 10.5 },
    { word: "paused", start: 10.5, end: 11.0 },
    { word: "at", start: 11.0, end: 11.2 },
    { word: "the", start: 11.2, end: 11.4 },
    { word: "crystal", start: 11.4, end: 11.9 },
    { word: "stream,", start: 11.9, end: 12.4 },
    { word: "its", start: 12.6, end: 12.8 },
    { word: "reflection", start: 12.8, end: 13.4 },
    { word: "shimmering", start: 13.4, end: 14.0 },
    { word: "in", start: 14.0, end: 14.2 },
    { word: "the", start: 14.2, end: 14.4 },
    { word: "gentle", start: 14.4, end: 14.8 },
    { word: "current.", start: 14.8, end: 15.5 },
  ];

  // Simulate playback
  React.useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.1;
        if (next > 16) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="p-4">
      <div className="mb-4 flex gap-4 items-center">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={() => setCurrentTime(0)}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Reset
        </button>
        <span className="text-gray-700">Time: {currentTime.toFixed(1)}s</span>
      </div>

      <ReadingView
        text={text}
        wordTimings={wordTimings}
        currentTime={currentTime}
        isPlaying={isPlaying}
        onWordClick={(index, time) => {
          console.log(`Clicked word ${index} at time ${time}`);
          setCurrentTime(time);
        }}
      />
    </div>
  );
};
