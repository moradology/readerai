/**
 * MSW Request Handlers for Mock API
 *
 * Defines mock API endpoints for development and testing
 */

import { http, HttpResponse } from 'msw';
import type { Passage } from '@features/reading/api/types';

const mockPassage: Passage = {
  id: '1',
  title: 'The Adventures of Tommy the Turtle',
  author: 'Jane Smith',
  content: 'Once upon a time, in a peaceful pond surrounded by tall grass and colorful flowers, there lived a young turtle named Tommy. Tommy was curious about the world beyond his pond. Every day, he would swim to the edge and peek through the reeds, wondering what adventures awaited him. One sunny morning, Tommy decided it was time to explore...',
  wordCount: 150,
  readingLevel: 'Grade 2',
  estimatedDuration: 120,
  tags: ['animals', 'adventure', 'nature'],
  language: 'en',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const handlers = [
  // Get initial passage (for demo mode)
  http.get('*/api/initial_passage', () => {
    return HttpResponse.json({
      passage: mockPassage,
      question: {
        type: 'vocabulary',
        question: 'What does "curious" mean?',
        options: [
          'Wanting to know or learn something',
          'Being very sleepy',
          'Feeling hungry',
          'Being scared'
        ],
        correctAnswer: 'Wanting to know or learn something',
      }
    });
  }),

  // Get passages list
  http.get('*/api/passages', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    return HttpResponse.json({
      data: [mockPassage],
      total: 1,
      page,
      limit,
      hasMore: false,
    });
  }),

  // Get single passage
  http.get('*/api/passages/:id', () => {
    return HttpResponse.json(mockPassage);
  }),

  // Create reading session
  http.post('*/api/sessions', async ({ request }) => {
    const body = await request.json() as any;

    return HttpResponse.json({
      data: {
        session: {
          id: 'session-1',
          userId: 'user-1',
          passageId: body?.passageId || 'mock-passage-1',
          startedAt: new Date().toISOString(),
          duration: 0,
          wordsRead: 0,
          currentPosition: 0,
          status: 'active',
          checkpoints: [],
          interruptions: [],
        },
        passage: mockPassage,
        audioUrl: '/mock-audio.mp3',
        wordTimings: [],
      },
      status: 'success',
    });
  }),
];
