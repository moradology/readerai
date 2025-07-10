/**
 * Mock WebSocket Handlers for Student Interruptions
 *
 * Simulates backend responses for development and testing
 */

import type {
  StudentInterruptionMessage,
  InterruptionAcknowledgedMessage,
  InterruptionResponseMessage,
  PauseAudioMessage,
  ResumeAudioMessage,
  InterruptionErrorMessage,
} from '@features/reading/websocket/types';

// Sample responses for different types of questions
const MOCK_RESPONSES = {
  vocabulary: [
    {
      responseText: "A pangram is a sentence that contains every letter of the alphabet at least once. It's often used for testing fonts and keyboards because it shows all the letters.",
      structuredData: {
        word: 'pangram',
        definition: 'A sentence containing all 26 letters of the alphabet',
        examples: [
          'The quick brown fox jumps over the lazy dog',
          'Pack my box with five dozen liquor jugs',
          'How vexingly quick daft zebras jump!'
        ],
        relatedWords: ['alphabet', 'typography', 'font'],
        difficulty: 'medium' as const,
      },
    },
  ],
  general: [
    {
      responseText: "That's a great question! Let me help you understand this better. The text is talking about how this special sentence has been used for over 100 years to test typewriters and keyboards.",
      suggestions: [
        { text: 'Tell me more', action: 'ask_more' as const },
        { text: 'Continue reading', action: 'continue' as const },
      ],
    },
  ],
  comprehension: [
    {
      responseText: "The main idea here is that certain sentences are useful for testing because they include many different letter combinations. This helps make sure all the keys on a keyboard are working properly.",
      responseType: 'explanation' as const,
    },
  ],
};

// Detect question type based on keywords
function detectQuestionType(question: string): 'vocabulary' | 'comprehension' | 'general' {
  const lower = question.toLowerCase();

  if (lower.includes('what does') || lower.includes('mean') || lower.includes('definition')) {
    return 'vocabulary';
  } else if (lower.includes('why') || lower.includes('how') || lower.includes('explain')) {
    return 'comprehension';
  } else {
    return 'general';
  }
}

// Get a mock response based on question type
function getMockResponse(question: string): InterruptionResponseMessage['payload'] {
  const type = detectQuestionType(question);
  const responses = MOCK_RESPONSES[type];
  const response = responses[Math.floor(Math.random() * responses.length)];

  return {
    responseText: response.responseText,
    responseType: response.responseType || (type === 'vocabulary' ? 'definition' : 'text'),
    structuredData: response.structuredData,
    suggestions: response.suggestions || [
      { text: '✓ Got it!', action: 'continue' },
      { text: '🔄 Read again', action: 'repeat' },
    ],
  };
}

export function setupInterruptionHandlers(ws: any): void {
  ws.on('connection', (client: any) => {
    // eslint-disable-next-line no-console
    console.log('[Mock WS] Client connected for interruptions');

    client.on('message', async (data: string) => {
      try {
        const message = JSON.parse(data);

        if (message.type === 'STUDENT_INTERRUPTION') {
          await handleStudentInterruption(client, message as StudentInterruptionMessage);
        } else if (message.type === 'RESUME_READING') {
          await handleResumeReading(client, message);
        } else if (message.type === 'REPEAT_AUDIO') {
          await handleRepeatAudio(client, message);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Mock WS] Error handling message:', error);
      }
    });
  });
}

async function handleStudentInterruption(
  client: any,
  message: StudentInterruptionMessage
): Promise<void> {
  const { payload } = message;

  // Step 1: Acknowledge the interruption immediately
  const ackMessage: InterruptionAcknowledgedMessage = {
    type: 'INTERRUPTION_ACKNOWLEDGED',
    payload: {
      pausedAtWordIndex: payload.context.currentWordIndex,
      pausedAtTimestamp: payload.context.audioTimestamp,
      processingEstimate: 2, // 2 seconds to "think"
    },
    timestamp: Date.now(),
  };
  client.send(JSON.stringify(ackMessage));

  // Step 2: Send pause audio command
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

  // Step 3: Simulate LLM processing delay
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

  // Step 4: Send the response
  try {
    const responsePayload = getMockResponse(payload.questionText);
    const responseMessage: InterruptionResponseMessage = {
      type: 'INTERRUPTION_RESPONSE',
      payload: responsePayload,
      timestamp: Date.now(),
    };
    client.send(JSON.stringify(responseMessage));
  } catch (error) {
    // Send error message if something goes wrong
    const errorMessage: InterruptionErrorMessage = {
      type: 'INTERRUPTION_ERROR',
      payload: {
        errorCode: 'unknown',
        userMessage: 'Sorry, I had trouble understanding your question. Please try again.',
        fallbackAction: 'continue',
      },
      timestamp: Date.now(),
    };
    client.send(JSON.stringify(errorMessage));
  }
}

async function handleResumeReading(client: any, message: any): Promise<void> {
  // Send resume audio command
  const resumeMessage: ResumeAudioMessage = {
    type: 'RESUME_AUDIO',
    payload: {
      fromWordIndex: message.payload.fromWordIndex || 0,
      fromTimestamp: message.payload.fromTimestamp || 0,
      playbackRate: 1.0, // Normal speed
    },
    timestamp: Date.now(),
  };
  client.send(JSON.stringify(resumeMessage));
}

async function handleRepeatAudio(client: any, message: any): Promise<void> {
  // First pause, then resume from requested position
  const pauseMessage: PauseAudioMessage = {
    type: 'PAUSE_AUDIO',
    payload: {
      reason: 'system',
      atWordIndex: message.payload.fromWordIndex,
      atTimestamp: 0,
    },
    timestamp: Date.now(),
  };
  client.send(JSON.stringify(pauseMessage));

  // Small delay before resuming
  await new Promise(resolve => setTimeout(resolve, 100));

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
