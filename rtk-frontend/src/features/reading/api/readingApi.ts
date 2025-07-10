/**
 * Reading Feature RTK Query API
 *
 * Responsibilities:
 * - Define all reading-related API endpoints using RTK Query
 * - Handle passage fetching and caching
 * - Manage reading session lifecycle (create, update, save)
 * - Submit checkpoint answers and track progress
 * - Handle interruption requests and responses
 * - Configure cache invalidation strategies
 * - Implement optimistic updates where appropriate
 */

import { baseApi } from '@shared/api/baseApi';
import type { PaginatedResponse } from '@shared/api/types';
import type {
  Passage,
  PassageMetadata,
  PassageFilters,
  CreateSessionRequest,
  CreateSessionResponse,
  ReadingSession,
  UpdateProgressRequest,
  ReadingProgress,
  SubmitCheckpointRequest,
  CheckpointResult,
  CreateInterruptionRequest,
  InterruptionRecord,
  SessionAnalytics,
} from './types';

// Inject endpoints into the base API
export const readingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Passage endpoints
    getPassages: builder.query<PaginatedResponse<PassageMetadata>, PassageFilters & { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/passages',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Passage' as const, id })),
              { type: 'Passage', id: 'LIST' },
            ]
          : [{ type: 'Passage', id: 'LIST' }],
    }),

    getPassage: builder.query<Passage, string>({
      query: (id) => `/passages/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Passage', id }],
    }),

    // For demo mode - get initial passage without auth
    getInitialPassage: builder.query<{ passage: Passage; question?: any }, void>({
      query: () => '/initial_passage',
      // Don't cache this as it's just for demo
      keepUnusedDataFor: 0,
    }),

    // Session endpoints
    createReadingSession: builder.mutation<CreateSessionResponse, CreateSessionRequest>({
      query: (body) => ({
        url: '/sessions',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ReadingSession', id: 'LIST' }],
    }),

    getSession: builder.query<ReadingSession, string>({
      query: (id) => `/sessions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'ReadingSession', id }],
    }),

    updateProgress: builder.mutation<ReadingProgress, UpdateProgressRequest>({
      query: ({ sessionId, ...body }) => ({
        url: `/sessions/${sessionId}/progress`,
        method: 'PUT',
        body,
      }),
      // Optimistic update
      async onQueryStarted({ sessionId, ...update }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          readingApi.util.updateQueryData('getSession', sessionId, (draft) => {
            Object.assign(draft, {
              currentPosition: update.currentWordIndex,
            });
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: 'ReadingSession', id: sessionId },
        { type: 'Progress', id: sessionId },
      ],
    }),

    endSession: builder.mutation<ReadingSession, { sessionId: string; reason: 'completed' | 'abandoned' }>({
      query: ({ sessionId, reason }) => ({
        url: `/sessions/${sessionId}/end`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: 'ReadingSession', id: sessionId },
        { type: 'ReadingSession', id: 'LIST' },
      ],
    }),

    // Checkpoint endpoints
    submitCheckpointAnswer: builder.mutation<CheckpointResult, SubmitCheckpointRequest>({
      query: ({ sessionId, ...body }) => ({
        url: `/sessions/${sessionId}/checkpoints`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: 'ReadingSession', id: sessionId },
        { type: 'Checkpoint', id: sessionId },
      ],
    }),

    // Interruption endpoints
    createInterruption: builder.mutation<InterruptionRecord, CreateInterruptionRequest>({
      query: ({ sessionId, ...body }) => ({
        url: `/sessions/${sessionId}/interruptions`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: 'ReadingSession', id: sessionId },
        { type: 'Interruption', id: sessionId },
      ],
    }),

    // Analytics endpoints
    getSessionAnalytics: builder.query<SessionAnalytics, string>({
      query: (sessionId) => `/sessions/${sessionId}/analytics`,
      providesTags: (_result, _error, sessionId) => [{ type: 'Analytics', id: sessionId }],
    }),

    getUserAnalytics: builder.query<{
      totalSessions: number;
      totalWordsRead: number;
      averageWPM: number;
      averageComprehension: number;
      streakDays: number;
    }, void>({
      query: () => '/analytics/user',
      providesTags: [{ type: 'Analytics', id: 'USER' }],
    }),
  }),
  overrideExisting: false,
});

// Export hooks for usage in functional components
export const {
  useGetPassagesQuery,
  useGetPassageQuery,
  useGetInitialPassageQuery,
  useCreateReadingSessionMutation,
  useGetSessionQuery,
  useUpdateProgressMutation,
  useEndSessionMutation,
  useSubmitCheckpointAnswerMutation,
  useCreateInterruptionMutation,
  useGetSessionAnalyticsQuery,
  useGetUserAnalyticsQuery,
} = readingApi;

// Export for use in SSR
export const { getPassages, getPassage, getSession } = readingApi.endpoints;
