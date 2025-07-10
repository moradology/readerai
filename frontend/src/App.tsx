import { Box, Heading, Text, useColorMode, Button, Container } from '@chakra-ui/react';
import { useEffect } from 'react';
import InteractiveReader from './features/reading/components/InteractiveReader';

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
      <Container maxW="container.lg">
        <header className="mb-8">
          <Heading as="h1" size="xl" className="text-gray-800 dark:text-white">
            ReaderAI
          </Heading>
          <Text className="text-gray-600 dark:text-gray-300 mt-2">
            Interactive AI-Powered Reading Assistant
          </Text>
          {isDevelopment && (
            <Button onClick={toggleColorMode} className="mt-4" size="sm">
              Toggle {colorMode === 'light' ? 'Dark' : 'Light'} Mode
            </Button>
          )}
        </header>

        <main>
          <Box className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <InteractiveReader />
          </Box>
        </main>
      </Container>
    </Box>
  );
}

export default App;
