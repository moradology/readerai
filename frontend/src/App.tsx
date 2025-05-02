import { Box, Heading, Text } from '@chakra-ui/react';
import Reader from './features/reader/components/Reader';

function App() {
  return (
    <Box className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <header className="mb-8">
        <Heading as="h1" size="xl" className="text-gray-800 dark:text-white">
          ReaderAI
        </Heading>
        <Text className="text-gray-600 dark:text-gray-300 mt-2">AI-Powered Reading Assistant</Text>
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
