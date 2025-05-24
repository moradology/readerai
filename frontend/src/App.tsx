// src/App.tsx

import {
  Box,
  Heading,
  Text,
  useColorMode,
  Button,
  VStack,
  Divider,
  Flex, // <-- Import Flex
  useColorModeValue, // <-- Import useColorModeValue
} from '@chakra-ui/react';
import { useEffect } from 'react';
import Reader from './features/reader/components/Reader';
import ChatClient from './features/chat/components/ChatClient'; // Adjust path if needed

function App() {
  const { colorMode, toggleColorMode } = useColorMode();
  const isDevelopment = import.meta.env.MODE === 'development';

  // Sync Chakra's color mode with Tailwind's dark mode class (if you still use Tailwind elsewhere)
  // Or just rely on Chakra's built-in dark mode
  useEffect(() => {
    if (colorMode === 'dark') {
      document.documentElement.classList.add('dark'); // For Tailwind if used
    } else {
      document.documentElement.classList.remove('dark'); // For Tailwind if used
    }
  }, [colorMode]);

  return (
    <Box className="min-h-screen bg-gray-50 dark:bg-gray-900" p={{ base: 3, md: 6 }}>
      <header className="mb-8">
        <Flex justifyContent="space-between" alignItems="center" wrap="wrap">
          <Box>
            <Heading as="h1" size="xl" color={useColorModeValue("gray.800", "white")}>
              ReaderAI
            </Heading>
            <Text color={useColorModeValue("gray.600", "gray.300")} mt={2}>
              AI-Powered Reading Assistant & Chat
            </Text>
          </Box>
          {isDevelopment && (
            <Button onClick={toggleColorMode} mt={{ base: 4, md: 0 }}>
              Toggle {colorMode === 'light' ? 'Dark' : 'Light'} Mode
            </Button>
          )}
        </Flex>
      </header>

      <VStack spacing={8} align="stretch">
        <Box className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <Heading as="h2" size="lg" mb={4} color={useColorModeValue("gray.700", "gray.100")}>
            Reader Demo
          </Heading>
          <Reader text="Welcome to ReaderAI. This is a simple demo of the reader component. It highlights words as they are read aloud using the browser's built-in speech synthesis capabilities. The component will advance through each word while simultaneously reading the text aloud. You can start, pause, and reset the reading process using the controls below." />
        </Box>

        <Divider />

        <Box className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <Heading as="h2" size="lg" mb={4} color={useColorModeValue("gray.700", "gray.100")}>
            AI Chat
          </Heading>
          <ChatClient />
        </Box>
      </VStack>
    </Box>
  );
}

export default App;