// src/features/chat/components/ChatClient.tsx
// (You might need to create these folders: src/features/chat/components)

import {
  Box,
  VStack,
  Input,
  Button,
  Text,
  Flex,
  useColorModeValue,
  Spinner,
  IconButton,
} from '@chakra-ui/react';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { FiSend } from 'react-icons/fi'; // Using react-icons for send icon

// --- Configuration Constants ---
const WEBSOCKET_URL = `wss://${window.location.host}/ws`;

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  isError?: boolean;
  isLoading?: boolean; // For AI "thinking..." message
}

const ChatClient = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState('Connecting...');
  const [isStatusError, setIsStatusError] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const websocket = useRef<WebSocket | null>(null);
  const chatboxRef = useRef<HTMLDivElement | null>(null);

  // Chakra UI color values
  const userMessageBg = useColorModeValue('blue.500', 'blue.300');
  const userMessageColor = useColorModeValue('white', 'gray.800');
  const aiMessageBg = useColorModeValue('gray.100', 'gray.700');
  const aiMessageColor = useColorModeValue('gray.800', 'white');
  const errorMessageBg = useColorModeValue('red.100', 'red.700');
  const errorMessageColor = useColorModeValue('red.700', 'red.100');
  const statusErrorBg = useColorModeValue('red.100', 'red.500');
  const statusErrorColor = useColorModeValue('red.700', 'white');
  const statusDefaultBg = useColorModeValue('gray.200', 'gray.600');
  const statusDefaultColor = useColorModeValue('gray.600', 'gray.100');
  const inputAreaBg = useColorModeValue('white', 'gray.750'); // Custom for dark mode

  const addMessageToList = (
    sender: ChatMessage['sender'],
    text: string,
    isError = false,
    isLoading = false
  ) => {
    setMessages((prevMessages) => {
      // Remove previous loading message if it exists
      const filteredMessages = prevMessages.filter(msg => !msg.isLoading);
      return [
        ...filteredMessages,
        { id: Date.now().toString() + Math.random(), sender, text, isError, isLoading },
      ];
    });
  };

  const updateLastAiMessage = (text: string, isError = false) => {
    setMessages(prevMessages => {
        const newMessages = [...prevMessages];
        const lastMessageIndex = newMessages.length - 1;
        if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].isLoading && newMessages[lastMessageIndex].sender === 'ai') {
            newMessages[lastMessageIndex] = {
                ...newMessages[lastMessageIndex],
                text,
                isError,
                isLoading: false,
            };
            return newMessages;
        }
        // If no loading message, or last message wasn't AI loading, add new
        return [...newMessages, {id: Date.now().toString() + Math.random(), sender: 'ai', text, isError, isLoading: false}];
    });
  };


  useEffect(() => {
    const connectWebSocket = () => {
      setStatus('Connecting...');
      setIsStatusError(false);
      setIsConnected(false);

      websocket.current = new WebSocket(WEBSOCKET_URL);

      websocket.current.onopen = () => {
        console.log('WebSocket connection opened');
        setStatus('Connected');
        setIsStatusError(false);
        setIsConnected(true);
      };

      websocket.current.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        try {
          const data = JSON.parse(event.data as string);
          if (data.type === 'initial') {
            if (data.payload?.passage) {
              updateLastAiMessage(`Passage:\n${data.payload.passage}`);
            } else {
              updateLastAiMessage('Could not load the passage.', true);
            }
            if (data.payload?.question && data.payload.question.toLowerCase().indexOf("error:") === -1) {
              const questionText = `Here's a vocabulary question:\n${data.payload.question}\n\nUsage Examples:\n${data.payload.usage_sentences || '(No usage sentences provided)'}`;
              addMessageToList('ai', questionText);
            } else if (data.payload?.question) {
              addMessageToList('ai', `Initial Question Status: ${data.payload.question}`, true);
            } else {
              addMessageToList('ai', '(Could not automatically generate an initial vocabulary question.)');
            }
          } else if (data.type === 'chat') {
            updateLastAiMessage(data.payload);
          } else if (data.type === 'error') {
            updateLastAiMessage(`Server Error: ${data.payload}`, true);
          } else {
            updateLastAiMessage(`Unknown message type received: ${data.type}`, true);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message or handling data:', error);
          updateLastAiMessage('Received malformed message from server.', true);
          if (typeof event.data === 'string') {
            addMessageToList('ai', `Raw data: ${event.data}`);
          }
        }
      };

      websocket.current.onerror = (event) => {
        console.error('WebSocket error observed:', event);
        setStatus('Connection Error');
        setIsStatusError(true);
        addMessageToList('system', 'WebSocket connection error. Please try refreshing.', true);
        setIsConnected(false);
      };

      websocket.current.onclose = (event) => {
        console.log('WebSocket connection closed:', event);
        setStatus(`Disconnected: ${event.reason || 'No reason given'} (Code: ${event.code})`);
        setIsStatusError(!event.wasClean);
        setIsConnected(false);
        // Remove any pending loading messages
        setMessages(prev => prev.filter(msg => !msg.isLoading));
      };
    };

    connectWebSocket();

    return () => {
      websocket.current?.close();
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleanup on unmount

  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const messageText = inputValue.trim();
    if (!messageText || !websocket.current || websocket.current.readyState !== WebSocket.OPEN) {
      console.log('Cannot send message: No text or WebSocket not open.');
      return;
    }

    addMessageToList('user', messageText);
    setInputValue('');
    addMessageToList('ai', '', false, true); // AI thinking message

    try {
      const messagePayload = JSON.stringify({
        type: 'chat',
        message: messageText,
      });
      websocket.current.send(messagePayload);
      console.log('Message sent:', messagePayload);
    } catch (error) {
      console.error('Error sending message via WebSocket:', error);
      updateLastAiMessage('Error sending message. Please check connection.', true);
    }
  };

  return (
    <Flex direction="column" h="calc(100vh - 200px)" /* Adjust height as needed */ maxH="700px" borderWidth="1px" borderRadius="lg" overflow="hidden">
      <Text
        p={2}
        fontSize="sm"
        textAlign="center"
        bg={isStatusError ? statusErrorBg : statusDefaultBg}
        color={isStatusError ? statusErrorColor : statusDefaultColor}
      >
        {status}
      </Text>
      <VStack
        ref={chatboxRef}
        flexGrow={1}
        overflowY="auto"
        p={4}
        spacing={3}
        alignItems="stretch" // Make messages stretch
      >
        {messages.map((msg) => (
          <Flex
            key={msg.id}
            direction="column" // Allow sender name + message text later
            alignSelf={msg.sender === 'user' ? 'flex-end' : 'flex-start'}
            w="fit-content" // Shrink to content
            maxW="70%"
          >
            <Box
              bg={
                msg.isError
                  ? errorMessageBg
                  : msg.sender === 'user'
                  ? userMessageBg
                  : aiMessageBg
              }
              color={
                msg.isError
                  ? errorMessageColor
                  : msg.sender === 'user'
                  ? userMessageColor
                  : aiMessageColor
              }
              px={4}
              py={2}
              borderRadius="lg"
              borderBottomRightRadius={msg.sender === 'user' ? '0' : undefined}
              borderBottomLeftRadius={msg.sender === 'ai' || msg.sender === 'system' ? '0' : undefined}
              sx={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
            >
              {msg.isLoading ? <Spinner size="xs" mr={2} /> : null}
              {msg.isLoading ? 'AI is thinking...' : msg.text}
            </Box>
          </Flex>
        ))}
      </VStack>
      <Box p={4} borderTopWidth="1px" bg={inputAreaBg}>
        <Flex as="form" onSubmit={handleSendMessage}>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            mr={2}
            isDisabled={!isConnected}
            flexGrow={1}
          />
          <IconButton
            aria-label="Send message"
            icon={<FiSend />}
            type="submit"
            colorScheme="blue"
            isDisabled={!isConnected || !inputValue.trim()}
          />
        </Flex>
      </Box>
    </Flex>
  );
};

export default ChatClient;