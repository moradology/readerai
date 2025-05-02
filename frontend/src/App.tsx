import { Box, Heading, Text, useColorMode, Button } from '@chakra-ui/react';
import { useEffect } from 'react';
import Reader from './features/reader/components/Reader';

function App() {
  const { colorMode, toggleColorMode } = useColorMode();
  const isDevelopment = import.meta.env.MODE === 'development';

  // Sync Chakra's color mode with Tailwind's dark mode class
  useEffect(() => {
    if (colorMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [colorMode]);

  return (
    <Box className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <header className="mb-8">
        <Heading as="h1" size="xl" className="text-gray-800 dark:text-white">
          ReaderAI
        </Heading>
        <Text className="text-gray-600 dark:text-gray-300 mt-2">
          AI-Powered Reading Assistant
        </Text>
        {isDevelopment && (
          <Button onClick={toggleColorMode} className="mt-4">
            Toggle {colorMode === 'light' ? 'Dark' : 'Light'} Mode
          </Button>
        )}
      </header>

      <main>
        <Box className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <Reader text="Welcome to ReaderAI. This is a simple demo of the reader component. It highlights words as they are read aloud using the browser's built-in speech synthesis capabilities. The component will advance through each word while simultaneously reading the text aloud. You can start, pause, and reset the reading process using the controls below." />
        </Box>
      </main>
    </Box>
  );
}

export default App;
