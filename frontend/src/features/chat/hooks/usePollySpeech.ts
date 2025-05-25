import { useState, useCallback, useRef, useEffect } from 'react';

// Define the shape of a Polly speech mark object from your Python backend
interface SpeechMark {
  time: number; // in milliseconds
  type: 'word';
  start: number;
  end: number;
  value: string;
}

export const usePollySpeech = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);

  // A ref to hold the audio element, which will be in the ChatClient component
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // A ref to hold the speech marks for the current utterance
  const speechMarksRef = useRef<SpeechMark[]>([]);

  /**
   * This function is called repeatedly as the audio plays.
   * It syncs the highlighted word with the audio's current time.
   */
  const onTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const currentTimeMs = audioRef.current.currentTime * 1000;
    
    let currentWordIndex = -1;
    // Find the last speech mark whose time is before the current audio time
    for (let i = 0; i < speechMarksRef.current.length; i++) {
        if (speechMarksRef.current[i].time <= currentTimeMs) {
            currentWordIndex = i;
        } else {
            break; // Stop searching once we've passed the current time
        }
    }
    setHighlightedWordIndex(currentWordIndex);
  }, []);

  /**
   * Resets all state and stops audio playback.
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ""; // Clear the audio source
    }
    setCurrentlySpeakingId(null);
    setHighlightedWordIndex(-1);
    setIsLoading(false);
    speechMarksRef.current = [];
  }, []);

  /**
   * The main function called by the UI. It fetches data and starts playback.
   */
  const speak = useCallback(async (text: string, messageId: string) => {
    // If the currently playing message is clicked, stop it.
    if (currentlySpeakingId === messageId) {
      stop();
      return;
    }

    stop(); // Stop any other message that might be playing
    setIsLoading(true);
    setCurrentlySpeakingId(messageId); // Set loading state for the new message

    try {
      // Fetch the audio and speech marks from our Python backend
      const response = await fetch('/api/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to fetch speech data from server.');
      }

      const { audioData, speechMarks } = await response.json();
      
      speechMarksRef.current = speechMarks;
      
      if (audioRef.current) {
        audioRef.current.src = audioData; // Set the audio source (base64 data URI)
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Error in speak function:', error);
      stop(); // Reset all state on error
    } 
    // Note: We don't set isLoading to false here. It's set to false when playback stops.
  }, [currentlySpeakingId, stop]);

  // This effect attaches and cleans up event listeners for the audio element.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handlePlay = () => setIsLoading(false); // Turn off spinner once audio starts
      
      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('ended', stop);
      audio.addEventListener('pause', stop);
      audio.addEventListener('play', handlePlay);

      return () => {
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('ended', stop);
        audio.removeEventListener('pause', stop);
        audio.removeEventListener('play', handlePlay);
      };
    }
  }, [onTimeUpdate, stop]);

  return { 
    speak, 
    stop, 
    currentlySpeakingId, 
    highlightedWordIndex, 
    isLoading, 
    audioRef // Export the ref to attach it in the component
  };
};