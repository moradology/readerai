// Interactive Reader component using the hybrid architecture

import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
  VStack,
  HStack,
  Progress,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  RadioGroup,
  Radio,
  Stack,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Badge,
} from '@chakra-ui/react';
import {
  ChevronDownIcon,
  RepeatIcon,
  QuestionIcon,
  InfoIcon,
  SettingsIcon,
} from '@chakra-ui/icons';
import { useReadingSession } from '../hooks/useReadingSession';
import { InterruptionType } from '../services/ReadingSessionManager';

const InteractiveReader: React.FC = () => {
  const toast = useToast();
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showInterruptionModal, setShowInterruptionModal] = useState(false);
  const [interruptionType, setInterruptionType] = useState<InterruptionType | null>(null);
  const [interruptionInput, setInterruptionInput] = useState('');
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [checkpointAnswer, setCheckpointAnswer] = useState('');

  const {
    state,
    words,
    progress,
    isInitialized,
    isReading,
    isPaused,
    isLoading,
    hasCheckpoint,
    isInterrupted,
    error,
    startReading,
    pauseReading,
    resumeReading,
    interrupt,
    submitCheckpointAnswer,
    seekToWord,
    setPlaybackSpeed: updatePlaybackSpeed,
  } = useReadingSession({
    onCheckpoint: () => {
      setShowCheckpointModal(true);
      toast({
        title: 'Comprehension Check',
        description: 'Time for a quick question!',
        status: 'info',
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    },
  });

  // Handle interruption
  const handleInterruption = useCallback((type: InterruptionType) => {
    setInterruptionType(type);
    setInterruptionInput('');
    setShowInterruptionModal(true);
  }, []);

  const submitInterruption = useCallback(() => {
    if (interruptionType) {
      interrupt(interruptionType, interruptionInput || undefined);
      setShowInterruptionModal(false);
      setInterruptionType(null);
      setInterruptionInput('');
    }
  }, [interrupt, interruptionType, interruptionInput]);

  // Handle checkpoint answer
  const handleCheckpointSubmit = useCallback(() => {
    submitCheckpointAnswer(checkpointAnswer);
    setShowCheckpointModal(false);
    setCheckpointAnswer('');
  }, [submitCheckpointAnswer, checkpointAnswer]);

  // Handle playback speed change
  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    updatePlaybackSpeed(speed);
  }, [updatePlaybackSpeed]);

  // Handle word click for seeking
  const handleWordClick = useCallback((index: number) => {
    if (state.wordTimings.length > 0) {
      seekToWord(index);
    }
  }, [seekToWord, state.wordTimings]);

  if (!isInitialized) {
    return (
      <VStack spacing={4} align="center" py={8}>
        <Text>Loading reading session...</Text>
      </VStack>
    );
  }

  if (error) {
    return (
      <VStack spacing={4} align="center" py={8}>
        <Text color="red.500">Error: {error.message}</Text>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </VStack>
    );
  }

  const currentCheckpoint = state.comprehensionCheckpoints[state.comprehensionCheckpoints.length - 1];

  return (
    <VStack spacing={6} align="stretch">
      {/* Progress bar */}
      <Box>
        <Flex justify="space-between" mb={2}>
          <Text fontSize="sm" color="gray.600">
            Reading Progress
          </Text>
          <Text fontSize="sm" color="gray.600">
            {Math.round(progress)}%
          </Text>
        </Flex>
        <Progress value={progress} size="sm" colorScheme="blue" />
      </Box>

      {/* Text display with word highlighting */}
      <Box
        className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg"
        minHeight="300px"
        maxHeight="500px"
        overflowY="auto"
      >
        <Text className="text-lg leading-relaxed">
          {words.map((word, index) => (
            <Text
              as="span"
              key={index}
              className={`inline-block px-0.5 cursor-pointer transition-colors ${
                index === state.currentWordIndex
                  ? 'bg-blue-400 dark:bg-blue-600 text-white rounded'
                  : index < state.currentWordIndex
                  ? 'text-gray-600 dark:text-gray-400'
                  : 'text-gray-800 dark:text-gray-200'
              } hover:bg-gray-200 dark:hover:bg-gray-700`}
              onClick={() => handleWordClick(index)}
            >
              {word}{' '}
            </Text>
          ))}
        </Text>
      </Box>

      {/* Control buttons */}
      <VStack spacing={4}>
        <HStack spacing={4} justify="center">
          {/* Main play/pause button */}
          {!isReading ? (
            <Button
              colorScheme="blue"
              size="lg"
              onClick={state.currentWordIndex === -1 ? startReading : resumeReading}
              isLoading={isLoading}
              loadingText="Starting..."
              isDisabled={isInterrupted || hasCheckpoint}
            >
              {state.currentWordIndex === -1 ? 'Start Reading' : 'Resume Reading'}
            </Button>
          ) : (
            <Button
              colorScheme="orange"
              size="lg"
              onClick={pauseReading}
            >
              Pause
            </Button>
          )}

          {/* Interruption menu */}
          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<ChevronDownIcon />}
              isDisabled={!isPaused && !isReading}
            >
              Ask Question
            </MenuButton>
            <MenuList>
              <MenuItem
                icon={<QuestionIcon />}
                onClick={() => handleInterruption('word_meaning')}
              >
                What does this word mean?
              </MenuItem>
              <MenuItem
                icon={<InfoIcon />}
                onClick={() => handleInterruption('clarification')}
              >
                I don't understand this part
              </MenuItem>
              <MenuItem
                icon={<RepeatIcon />}
                onClick={() => handleInterruption('repeat')}
              >
                Can you repeat that?
              </MenuItem>
              <MenuItem
                icon={<QuestionIcon />}
                onClick={() => handleInterruption('question')}
              >
                I have a question...
              </MenuItem>
            </MenuList>
          </Menu>

          {/* Settings menu */}
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<SettingsIcon />}
              variant="outline"
            />
            <MenuList>
              <Box px={4} py={2}>
                <Text mb={2}>Reading Speed: {playbackSpeed}x</Text>
                <Slider
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={playbackSpeed}
                  onChange={handleSpeedChange}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </Box>
            </MenuList>
          </Menu>
        </HStack>

        {/* Status badges */}
        <HStack spacing={2} justify="center">
          {isReading && (
            <Badge colorScheme="green" variant="subtle">
              Reading
            </Badge>
          )}
          {isPaused && (
            <Badge colorScheme="yellow" variant="subtle">
              Paused
            </Badge>
          )}
          {isInterrupted && (
            <Badge colorScheme="orange" variant="subtle">
              Interrupted
            </Badge>
          )}
          {hasCheckpoint && (
            <Badge colorScheme="purple" variant="subtle">
              Checkpoint
            </Badge>
          )}
        </HStack>
      </VStack>

      {/* Interruption Modal */}
      <Modal
        isOpen={showInterruptionModal}
        onClose={() => setShowInterruptionModal(false)}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {interruptionType === 'word_meaning' && 'Word Meaning'}
            {interruptionType === 'clarification' && 'Need Clarification'}
            {interruptionType === 'repeat' && 'Repeat Section'}
            {interruptionType === 'question' && 'Your Question'}
          </ModalHeader>
          <ModalBody>
            {interruptionType === 'question' && (
              <Input
                placeholder="Type your question here..."
                value={interruptionInput}
                onChange={(e) => setInterruptionInput(e.target.value)}
                autoFocus
              />
            )}
            {interruptionType === 'word_meaning' && (
              <Text>
                I'll explain the meaning of the word you're asking about.
              </Text>
            )}
            {interruptionType === 'clarification' && (
              <Text>
                I'll help clarify this section for you.
              </Text>
            )}
            {interruptionType === 'repeat' && (
              <Text>
                I'll repeat the last section for you.
              </Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setShowInterruptionModal(false)}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={submitInterruption}>
              Submit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Checkpoint Modal */}
      <Modal
        isOpen={showCheckpointModal}
        onClose={() => {}}
        closeOnOverlayClick={false}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Comprehension Check</ModalHeader>
          <ModalBody>
            {currentCheckpoint && (
              <VStack spacing={4} align="stretch">
                <Text fontWeight="bold">{currentCheckpoint.question}</Text>
                {currentCheckpoint.type === 'vocabulary' && (
                  <RadioGroup
                    value={checkpointAnswer}
                    onChange={setCheckpointAnswer}
                  >
                    <Stack>
                      {/* This would be populated with options from the checkpoint */}
                      <Radio value="option1">Option 1</Radio>
                      <Radio value="option2">Option 2</Radio>
                      <Radio value="option3">Option 3</Radio>
                    </Stack>
                  </RadioGroup>
                )}
                {currentCheckpoint.type !== 'vocabulary' && (
                  <Input
                    placeholder="Type your answer..."
                    value={checkpointAnswer}
                    onChange={(e) => setCheckpointAnswer(e.target.value)}
                  />
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              onClick={handleCheckpointSubmit}
              isDisabled={!checkpointAnswer}
            >
              Submit Answer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default InteractiveReader;
