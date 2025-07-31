/**
 * WebSocket Redux Middleware
 *
 * Synchronizes Redux state with WebSocket messages:
 * - Forwards specific Redux actions to WebSocket
 * - Dispatches Redux actions from WebSocket messages
 * - Handles connection state in Redux
 * - Manages bidirectional data flow
 */

import { Middleware } from '@reduxjs/toolkit';
import type { WebSocketProvider, WebSocketMessage } from '@providers/types';
import { readingActions } from '@features/reading/store/readingSlice';

// WebSocket state slice actions (we'll create this slice next)
export const websocketActions = {
  connected: (payload?: any) => ({ type: 'websocket/connected', payload }),
  disconnected: (payload?: any) => ({ type: 'websocket/disconnected', payload }),
  reconnecting: (payload?: any) => ({ type: 'websocket/reconnecting', payload }),
  error: (payload: any) => ({ type: 'websocket/error', payload }),
  messageReceived: (payload: WebSocketMessage) => ({ type: 'websocket/messageReceived', payload }),
  messageSent: (payload: WebSocketMessage) => ({ type: 'websocket/messageSent', payload }),
};

// Actions to forward to WebSocket
const actionsToForward = [
  readingActions.updateProgress.type,
  readingActions.createInterruption.type,
  readingActions.submitCheckpointAnswer.type,
];

// WebSocket message handlers
const messageHandlers: Record<string, (dispatch: any, payload: any) => void> = {
  'session.started': (dispatch, payload) => {
    dispatch(readingActions.sessionStarted(payload));
  },
  'progress.synced': (dispatch, payload) => {
    dispatch(readingActions.progressSynced(payload));
  },
  'checkpoint.triggered': (dispatch, payload) => {
    dispatch(readingActions.checkpointTriggered(payload));
  },
  'interruption.response': (dispatch, payload) => {
    dispatch(readingActions.interruptionResponseReceived(payload));
  },
  'reading.highlight': (dispatch, payload) => {
    dispatch(readingActions.updateHighlight(payload));
  },
  'session.ended': (dispatch, payload) => {
    dispatch(readingActions.sessionEnded(payload));
  },
};

export const createWebSocketMiddleware = (
  getProvider: () => WebSocketProvider | null
): Middleware => {
  return (store) => {
    let unsubscribers: (() => void)[] = [];

    // Set up WebSocket event handlers
    const setupWebSocketHandlers = (provider: WebSocketProvider) => {
      // Clean up previous handlers
      unsubscribers.forEach(unsub => unsub());
      unsubscribers = [];

      // Handle connection state changes
      unsubscribers.push(
        provider.on('state', (state) => {
          switch (state) {
            case 'connected':
              store.dispatch(websocketActions.connected());
              break;
            case 'disconnected':
              store.dispatch(websocketActions.disconnected());
              break;
            case 'reconnecting':
              store.dispatch(websocketActions.reconnecting());
              break;
            case 'error':
              store.dispatch(websocketActions.error({ state }));
              break;
          }
        })
      );

      // Handle incoming messages
      unsubscribers.push(
        provider.on('message', (message: WebSocketMessage) => {
          // Log received message
          store.dispatch(websocketActions.messageReceived(message));

          // Handle specific message types
          const handler = messageHandlers[message.type];
          if (handler) {
            handler(store.dispatch, message.payload);
          }
        })
      );

      // Handle errors
      unsubscribers.push(
        provider.on('error', (error) => {
          store.dispatch(websocketActions.error(error));
        })
      );
    };

    return (next) => (action: any) => {
      const provider = getProvider();

      // Set up handlers when provider becomes available
      if (provider && unsubscribers.length === 0) {
        setupWebSocketHandlers(provider);
      }

      // Forward specific actions to WebSocket
      if (provider?.isConnected() && actionsToForward.includes(action.type)) {
        const message = actionToWebSocketMessage(action);
        if (message) {
          provider.send(message);
          store.dispatch(websocketActions.messageSent(message));
        }
      }

      // Continue with normal Redux flow
      return next(action);
    };
  };
};

// Convert Redux actions to WebSocket messages
function actionToWebSocketMessage(action: any): WebSocketMessage | null {
  switch (action.type) {
    case readingActions.updateProgress.type:
      return {
        type: 'progress.update',
        payload: action.payload,
      };

    case readingActions.createInterruption.type:
      return {
        type: 'interruption.create',
        payload: action.payload,
      };

    case readingActions.submitCheckpointAnswer.type:
      return {
        type: 'checkpoint.answer',
        payload: action.payload,
      };

    default:
      return null;
  }
}

// Helper to check if WebSocket is ready
export const isWebSocketReady = (state: any): boolean => {
  return state.websocket?.connectionState === 'connected';
};

// Selectors for WebSocket state
export const selectWebSocketState = (state: any) => state.websocket?.connectionState;
export const selectWebSocketError = (state: any) => state.websocket?.error;
export const selectLastMessage = (state: any) => state.websocket?.lastMessage;
