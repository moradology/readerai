import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook to manage speech synthesis.
 * @returns An object with a `speak` function, a `cancel` function,
 * and the ID of the message currently being spoken.
 */
export const useSpeech = () => {
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);

  // The main function to speak a piece of text
  const speak = useCallback((text: string, messageId: string) => {
    // If the button for the currently playing message is clicked again, stop it.
    if (currentlySpeakingId === messageId) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
      return;
    }

    // If another message is playing, cancel it before starting the new one.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0; // You can adjust the speed here

    // When the speech ends naturally, reset the speaking ID
    utterance.onend = () => {
      setCurrentlySpeakingId(null);
    };
    
    // If there's an error, also reset the ID
    utterance.onerror = (event) => {
      console.error('SpeechSynthesisUtterance.onerror', event);
      setCurrentlySpeakingId(null);
    };

    // Speak the text and set the current message ID
    window.speechSynthesis.speak(utterance);
    setCurrentlySpeakingId(messageId);

  }, [currentlySpeakingId]); // Reruns only when the speaking ID changes

  // A function to explicitly cancel speech
  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
    setCurrentlySpeakingId(null);
  }, []);

  // Cleanup effect to stop speech when the component unmounts
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return { speak, cancel, currentlySpeakingId };
};