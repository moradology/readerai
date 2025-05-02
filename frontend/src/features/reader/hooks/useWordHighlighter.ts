import { useState, useCallback, useRef } from 'react';

interface WordHighlighterOptions {
  words: string[];
  speed?: number; // milliseconds per word
  onComplete?: () => void;
}

interface WordHighlighterResult {
  currentIndex: number;
  isPlaying: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useWordHighlighter({
  words,
  speed = 250, // Default speed: 250ms per word
  onComplete,
}: WordHighlighterOptions): WordHighlighterResult {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const clearHighlightInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (isPlaying) return;

    setIsPlaying(true);

    // If we're at the end or haven't started, reset to beginning
    if (currentIndex >= words.length - 1 || currentIndex === -1) {
      setCurrentIndex(0);
    } else {
      // Otherwise start from current position + 1
      setCurrentIndex((prevIndex) => prevIndex + 1);
    }

    clearHighlightInterval();

    intervalRef.current = window.setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;

        // If we've reached the end
        if (nextIndex >= words.length) {
          clearHighlightInterval();
          setIsPlaying(false);

          if (onComplete) {
            onComplete();
          }

          return prevIndex; // Keep the last word highlighted
        }

        return nextIndex;
      });
    }, speed);
  }, [isPlaying, currentIndex, words.length, clearHighlightInterval, speed, onComplete]);

  const stop = useCallback(() => {
    setIsPlaying(false);
    clearHighlightInterval();
  }, [clearHighlightInterval]);

  const reset = useCallback(() => {
    stop();
    setCurrentIndex(-1);
  }, [stop]);

  // Clean up interval on unmount
  return { currentIndex, isPlaying, start, stop, reset };
}

export default useWordHighlighter;
