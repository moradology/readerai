/**
 * useWebSocket Hook
 *
 * Provides a React hook interface for WebSocket communication
 * Integrates with the WebSocketService and Redux state
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAppDispatch } from '@app/hooks';
import { websocketActions } from '@features/websocket/websocketSlice';
import { WebSocketService } from '@services/websocket/WebSocketService';
import type { WebSocketMessage } from '@providers/types';

interface UseWebSocketReturn {
  sendMessage: (message: WebSocketMessage) => void;
  subscribe: (messageType: string, handler: (message: WebSocketMessage) => void) => () => void;
  unsubscribe: (messageType: string, handler: (message: WebSocketMessage) => void) => void;
  connect: () => void;
  disconnect: () => void;
  isConnected: boolean;
}

// Singleton WebSocket service instance
let wsService: WebSocketService | null = null;

export function useWebSocket(): UseWebSocketReturn {
  const dispatch = useAppDispatch();
  const handlersRef = useRef<Map<string, Set<(message: WebSocketMessage) => void>>>(new Map());
  const isConnectedRef = useRef(false);

  // Initialize WebSocket service
  useEffect(() => {
    if (!wsService) {
      wsService = new WebSocketService({
        url: import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws',
        reconnectInterval: 3000,
        maxReconnectAttempts: 5,
      });

      // Set up global message handler
      wsService.onMessage((message: WebSocketMessage) => {
        // Dispatch to Redux
        dispatch(websocketActions.messageReceived(message));

        // Call registered handlers for this message type
        const handlers = handlersRef.current.get(message.type);
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(message);
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error(`Error in WebSocket handler for ${message.type}:`, error);
            }
          });
        }
      });

      // Set up connection state handlers
      wsService.onConnect(() => {
        dispatch(websocketActions.connected());
        isConnectedRef.current = true;
      });

      wsService.onDisconnect(() => {
        dispatch(websocketActions.disconnected());
        isConnectedRef.current = false;
      });

      wsService.onError((error) => {
        dispatch(websocketActions.error({
          code: 'CONNECTION_ERROR',
          message: error.message,
          timestamp: Date.now(),
        }));
      });

      // Auto-connect
      wsService.connect();
    }

    return () => {
      // Don't disconnect on unmount - keep connection alive
    };
  }, [dispatch]);

  // Send a message
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsService) {
      wsService.send(message);
      dispatch(websocketActions.messageSent(message));
    } else {
      // eslint-disable-next-line no-console
      console.error('WebSocket service not initialized');
    }
  }, [dispatch]);

  // Subscribe to a message type
  const subscribe = useCallback((messageType: string, handler: (message: WebSocketMessage) => void) => {
    if (!handlersRef.current.has(messageType)) {
      handlersRef.current.set(messageType, new Set());
    }

    const handlers = handlersRef.current.get(messageType)!;
    handlers.add(handler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        handlersRef.current.delete(messageType);
      }
    };
  }, []);

  // Unsubscribe from a message type
  const unsubscribe = useCallback((messageType: string, handler: (message: WebSocketMessage) => void) => {
    const handlers = handlersRef.current.get(messageType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        handlersRef.current.delete(messageType);
      }
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    wsService?.connect();
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    wsService?.disconnect();
  }, []);

  return {
    sendMessage,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    isConnected: isConnectedRef.current,
  };
}
