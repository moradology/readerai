/**
 * WebSocket Redux Slice
 *
 * Manages WebSocket connection state in Redux store
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { WebSocketState, WebSocketMessage, WebSocketError } from '@providers/types';

interface WebSocketSliceState {
  connectionState: WebSocketState;
  error: WebSocketError | null;
  lastMessage: WebSocketMessage | null;
  lastMessageSent: WebSocketMessage | null;
  messageHistory: WebSocketMessage[];
  reconnectAttempts: number;
}

const initialState: WebSocketSliceState = {
  connectionState: 'disconnected',
  error: null,
  lastMessage: null,
  lastMessageSent: null,
  messageHistory: [],
  reconnectAttempts: 0,
};

const websocketSlice = createSlice({
  name: 'websocket',
  initialState,
  reducers: {
    connected: (state) => {
      state.connectionState = 'connected';
      state.error = null;
      state.reconnectAttempts = 0;
    },
    disconnected: (state) => {
      state.connectionState = 'disconnected';
    },
    reconnecting: (state) => {
      state.connectionState = 'reconnecting';
      state.reconnectAttempts++;
    },
    error: (state, action: PayloadAction<WebSocketError>) => {
      state.connectionState = 'error';
      state.error = action.payload;
    },
    messageReceived: (state, action: PayloadAction<WebSocketMessage>) => {
      state.lastMessage = action.payload;
      state.messageHistory.push(action.payload);
      // Keep only last 50 messages
      if (state.messageHistory.length > 50) {
        state.messageHistory.shift();
      }
    },
    messageSent: (state, action: PayloadAction<WebSocketMessage>) => {
      state.lastMessageSent = action.payload;
    },
    clearHistory: (state) => {
      state.messageHistory = [];
      state.lastMessage = null;
      state.lastMessageSent = null;
    },
  },
});

export const websocketActions = websocketSlice.actions;
export const websocketReducer = websocketSlice.reducer;

// Selectors
export const selectConnectionState = (state: { websocket: WebSocketSliceState }) =>
  state.websocket.connectionState;

export const selectIsConnected = (state: { websocket: WebSocketSliceState }) =>
  state.websocket.connectionState === 'connected';

export const selectWebSocketError = (state: { websocket: WebSocketSliceState }) =>
  state.websocket.error;

export const selectMessageHistory = (state: { websocket: WebSocketSliceState }) =>
  state.websocket.messageHistory;

export const selectReconnectAttempts = (state: { websocket: WebSocketSliceState }) =>
  state.websocket.reconnectAttempts;
