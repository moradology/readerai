/**
 * Convert Timing Data
 *
 * Converts alignment data from speech recognition format to our WordTiming format
 */

import type { WordTiming } from '@features/reading/api/types';

interface AlignmentWord {
  word: string;
  start: number;
  end: number;
  case: string;
  startOffset: number;
  endOffset: number;
}

export function convertAlignmentToWordTimings(alignmentData: { words: AlignmentWord[] }): WordTiming[] {
  const wordTimings: WordTiming[] = [];
  let wordIndex = 0;

  for (const alignedWord of alignmentData.words) {
    // Skip words that weren't found in audio
    if (alignedWord.case === 'not-found-in-audio') {
      continue;
    }

    // Convert seconds to milliseconds
    const startTime = Math.round(alignedWord.start * 1000);
    const endTime = Math.round(alignedWord.end * 1000);

    wordTimings.push({
      word: alignedWord.word,
      startTime,
      endTime,
      wordIndex: wordIndex++,
    });
  }

  return wordTimings;
}

// Export the converted timings from the demo transcription
export async function loadDemoWordTimings(): Promise<WordTiming[]> {
  try {
    const response = await fetch('/demo_transcription/align.json');
    if (!response.ok) {
      throw new Error(`Failed to load align.json: ${response.status} ${response.statusText}`);
    }
    const alignmentData = await response.json();
    return convertAlignmentToWordTimings(alignmentData);
  } catch (error) {
    console.error('[convertTimings] Failed to load demo timings:', error);
    throw error; // Re-throw to allow proper error handling
  }
}
