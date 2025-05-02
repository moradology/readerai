import { Box, Button, Flex, Text, VStack } from '@chakra-ui/react';
import { useState, useCallback, useEffect } from 'react';
import useWordHighlighter from '../hooks/useWordHighlighter';

interface ReaderProps {
  text: string;
}

const Reader: React.FC<ReaderProps> = ({ text }) => {
  // Split the text into words
  const words = text.split(/\s+/).filter(Boolean);

  // State to track if speech synthesis is available
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  // Use our custom hook for word highlighting
  const { currentIndex, isPlaying, start, stop, reset } = useWordHighlighter({
    words,
    speed: 300, // 300ms per word
    onComplete: () => {
      // Stop TTS when highlighting completes
      window.speechSynthesis?.cancel();
    },
  });

  // Initialize speech synthesis
  useEffect(() => {
    if (!window.speechSynthesis) {
      setIsSpeechSupported(false);
    }
  }, []);

  // Handle start reading
  const handleStartReading = useCallback(() => {
    // Reset any ongoing speech
    window.speechSynthesis?.cancel();

    // Create a new utterance with the text
    const utterance = new SpeechSynthesisUtterance(text);

    // Configure speech rate
    utterance.rate = 1.0;

    // Start word highlighting
    start();

    // Start speaking if supported
    if (window.speechSynthesis) {
      window.speechSynthesis.speak(utterance);
    }
  }, [text, start]);

  // Handle stop reading
  const handleStopReading = useCallback(() => {
    stop();
    window.speechSynthesis?.cancel();
  }, [stop]);

  return (
    <VStack spacing={6} align="stretch">
      <Box className="p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
        <Text className="text-lg leading-relaxed text-gray-800 dark:text-gray-100">
          {words.map((word, index) => (
            <Text
              as="span"
              key={index}
              className={`inline-block px-0.5 ${
                index === currentIndex
                  ? 'bg-blue-200 dark:bg-blue-600 text-blue-800 dark:text-blue-50 rounded'
                  : ''
              }`}
            >
              {word}{' '}
            </Text>
          ))}
        </Text>
      </Box>

      <Flex justify="center" gap={4}>
        {!isPlaying ? (
          <Button
            colorScheme="blue"
            onClick={handleStartReading}
            className="px-6"
            isDisabled={!isSpeechSupported}
          >
            {currentIndex === -1 ? 'Start Reading' : 'Resume Reading'}
          </Button>
        ) : (
          <Button colorScheme="red" onClick={handleStopReading} className="px-6">
            Pause Reading
          </Button>
        )}

        <Button variant="outline" onClick={reset} isDisabled={currentIndex === -1} className="px-6">
          Reset
        </Button>
      </Flex>

      {!isSpeechSupported && (
        <Text color="red.500" textAlign="center">
          Speech synthesis is not supported in your browser.
        </Text>
      )}
    </VStack>
  );
}

export default Reader;
