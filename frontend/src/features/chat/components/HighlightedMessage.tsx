import { Text, useColorModeValue } from '@chakra-ui/react';
import React from 'react';

interface HighlightedMessageProps {
  text: string;
  highlightedWordIndex: number;
}

const HighlightedMessage: React.FC<HighlightedMessageProps> = ({ text, highlightedWordIndex }) => {
  const words = text.split(/\s+/).filter(Boolean);
  const highlightBg = useColorModeValue('blue.200', 'blue.600');
  const highlightColor = useColorModeValue('blue.800', 'blue.50');

  return (
    <Text sx={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
      {words.map((word, index) => (
        <Text
          as="span"
          key={index}
          bg={index === highlightedWordIndex ? highlightBg : 'transparent'}
          color={index === highlightedWordIndex ? highlightColor : 'inherit'}
          transition="background-color 0.1s ease-in-out" // Smoother highlight
          p={index === highlightedWordIndex ? '0.5' : '0'}
          m={index === highlightedWordIndex ? '-0.5' : '0'}
          borderRadius={index === highlightedWordIndex ? 'md' : 'none'}
        >
          {word}{' '}
        </Text>
      ))}
    </Text>
  );
};

export default HighlightedMessage;