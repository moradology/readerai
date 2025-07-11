/**
 * MSW WebSocket Handlers
 *
 * Mock WebSocket server for development and testing
 * Uses MSW's WebSocket support for realistic communication
 */

import { ws } from 'msw';
import type {
  StudentInterruptionMessage,
  InterruptionAcknowledgedMessage,
  InterruptionResponseMessage,
  PauseAudioMessage,
  ResumeAudioMessage,
} from '@features/reading/websocket/types';

// Create WebSocket link
const chat = ws.link('ws://localhost:8000/ws');

// Sample responses for different types of questions
const VOCABULARY_RESPONSES = [
  {
    word: 'pangram',
    definition: 'A sentence containing all 26 letters of the alphabet',
    examples: [
      'The quick brown fox jumps over the lazy dog',
      'Pack my box with five dozen liquor jugs',
    ],
  },
  {
    word: 'ephemeral',
    definition: 'Lasting for a very short time; transitory',
    examples: [
      'The beauty of cherry blossoms is ephemeral',
      'Social media stories are ephemeral by design',
    ],
  },
];

// Helper to detect question type
function analyzeQuestion(question: string): { type: string; word?: string } {
  const lower = question.toLowerCase();

  // Check for vocabulary questions
  const vocabMatch = lower.match(/what (?:does|is)(?: the word)? ['""]?(\w+)['""]? mean/);
  if (vocabMatch) {
    return { type: 'vocabulary', word: vocabMatch[1] };
  }

  if (lower.includes('mean') || lower.includes('definition')) {
    return { type: 'vocabulary' };
  }

  if (lower.includes('why') || lower.includes('how')) {
    return { type: 'comprehension' };
  }

  return { type: 'general' };
}

export const websocketHandlers = [
  chat.addEventListener('connection', ({ client }) => {
    // eslint-disable-next-line no-console
    console.log('[MSW WebSocket] Client connected');

    client.send(JSON.stringify({
      type: 'CONNECTION_ESTABLISHED',
      payload: { message: 'Connected to mock WebSocket server' },
      timestamp: Date.now(),
    }));
  }),

  chat.addEventListener('message', async ({ client, data }) => {
    try {
      const message = JSON.parse(data.toString());
      // eslint-disable-next-line no-console
      console.log('[MSW WebSocket] Received:', message.type);

      switch (message.type) {
        case 'STUDENT_INTERRUPTION':
          await handleStudentInterruption(client, message as StudentInterruptionMessage);
          break;

        case 'RESUME_READING':
          await handleResumeReading(client, message);
          break;

        case 'REPEAT_AUDIO':
          await handleRepeatAudio(client, message);
          break;

        default:
          // Echo unknown messages for debugging
          client.send(JSON.stringify({
            type: 'ECHO',
            payload: { originalMessage: message },
            timestamp: Date.now(),
          }));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[MSW WebSocket] Error handling message:', error);
      client.send(JSON.stringify({
        type: 'ERROR',
        payload: { message: 'Failed to process message' },
        timestamp: Date.now(),
      }));
    }
  }),

  chat.addEventListener('close', () => {
    // eslint-disable-next-line no-console
    console.log('[MSW WebSocket] Client disconnected');
  }),
];

async function handleStudentInterruption(
  client: any,
  message: StudentInterruptionMessage
): Promise<void> {
  const { payload } = message;

  // Step 1: Acknowledge immediately
  const ackMessage: InterruptionAcknowledgedMessage = {
    type: 'INTERRUPTION_ACKNOWLEDGED',
    payload: {
      pausedAtWordIndex: payload.context.currentWordIndex,
      pausedAtTimestamp: payload.context.audioTimestamp,
      processingEstimate: 2,
    },
    timestamp: Date.now(),
  };
  client.send(JSON.stringify(ackMessage));

  // Step 2: Pause audio
  const pauseMessage: PauseAudioMessage = {
    type: 'PAUSE_AUDIO',
    payload: {
      reason: 'student_interruption',
      atWordIndex: payload.context.currentWordIndex,
      atTimestamp: payload.context.audioTimestamp,
    },
    timestamp: Date.now(),
  };
  client.send(JSON.stringify(pauseMessage));

  // Step 3: Simulate processing
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Step 4: Generate response
  const analysis = analyzeQuestion(payload.questionText);
  let responsePayload: InterruptionResponseMessage['payload'];

  if (analysis.type === 'vocabulary') {
    const vocabData = VOCABULARY_RESPONSES[0]; // In real app, would look up the word
    responsePayload = {
      responseText: `"${vocabData.word}" means: ${vocabData.definition}`,
      responseType: 'definition',
      structuredData: {
        word: vocabData.word,
        definition: vocabData.definition,
        examples: vocabData.examples,
        difficulty: 'medium',
      },
      suggestions: [
        { text: 'Got it!', action: 'continue' },
        { text: 'Give me another example', action: 'ask_more' },
      ],
    };
  } else if (analysis.type === 'comprehension') {
    responsePayload = {
      responseText: 'Great question! This passage is explaining how certain sentences are useful for testing because they contain all the letters of the alphabet. This helps people check if their keyboard or typewriter is working correctly.',
      responseType: 'explanation',
      suggestions: [
        { text: 'That makes sense!', action: 'continue' },
        { text: 'Read this part again', action: 'repeat' },
      ],
    };
  } else {
    responsePayload = {
      responseText: `I understand you're asking about "${payload.questionText}". Let me help you with that. ${payload.context.currentSentence} - This means that the text is showing an example of something special.`,
      responseType: 'text',
      suggestions: [
        { text: 'Continue reading', action: 'continue' },
      ],
    };
  }

  const responseMessage: InterruptionResponseMessage = {
    type: 'INTERRUPTION_RESPONSE',
    payload: responsePayload,
    timestamp: Date.now(),
  };
  client.send(JSON.stringify(responseMessage));
}

async function handleResumeReading(client: any, message: any): Promise<void> {
  // Track the feedback if provided
  if (message.payload.helpful !== undefined) {
    // eslint-disable-next-line no-console
    console.log('[MSW WebSocket] Feedback received:', message.payload);
  }

  // Send resume command
  const resumeMessage: ResumeAudioMessage = {
    type: 'RESUME_AUDIO',
    payload: {
      fromWordIndex: message.payload.fromWordIndex || 0,
      fromTimestamp: message.payload.fromTimestamp || 0,
      playbackRate: 1.0,
    },
    timestamp: Date.now(),
  };
  client.send(JSON.stringify(resumeMessage));
}

async function handleRepeatAudio(client: any, message: any): Promise<void> {
  // Acknowledge the repeat request
  client.send(JSON.stringify({
    type: 'REPEAT_ACKNOWLEDGED',
    payload: {
      fromWordIndex: message.payload.fromWordIndex,
      reason: message.payload.reason,
    },
    timestamp: Date.now(),
  }));

  // Small delay then resume from requested position
  await new Promise(resolve => setTimeout(resolve, 200));

  const resumeMessage: ResumeAudioMessage = {
    type: 'RESUME_AUDIO',
    payload: {
      fromWordIndex: message.payload.fromWordIndex,
      fromTimestamp: 0,
      playbackRate: 0.9, // Slightly slower for repeat
    },
    timestamp: Date.now(),
  };
  client.send(JSON.stringify(resumeMessage));
}
