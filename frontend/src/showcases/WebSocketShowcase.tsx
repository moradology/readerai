/**
 * WebSocket Connection Showcase
 *
 * Demonstrates WebSocket functionality:
 * - Connection states and transitions
 * - Message sending and receiving
 * - Reconnection behavior
 * - Error handling
 * - Redux integration
 */

import { useState, useEffect } from 'react';
import { ShowcaseContainer, ShowcaseSection } from './components/ShowcaseContainer';
import { useWebSocketProvider } from '@providers/ProviderContext';
import { useAppSelector } from '@app/hooks';
import {
  selectConnectionState,
  selectIsConnected,
  selectWebSocketError,
  selectMessageHistory,
  selectReconnectAttempts
} from '@features/websocket/websocketSlice';
import { DemoWebSocketProvider } from '@providers/websocket/DemoWebSocketProvider';
import type { WebSocketState } from '@providers/types';

export function WebSocketShowcase() {
  const provider = useWebSocketProvider();
  const connectionState = useAppSelector(selectConnectionState);
  const isConnected = useAppSelector(selectIsConnected);
  const error = useAppSelector(selectWebSocketError);
  const messageHistory = useAppSelector(selectMessageHistory);
  const reconnectAttempts = useAppSelector(selectReconnectAttempts);

  const [customMessage, setCustomMessage] = useState('');

  // Type guard for demo provider
  const isDemoProvider = provider instanceof DemoWebSocketProvider;

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!provider) return;

    const unsubscribers: (() => void)[] = [];

    // Subscribe to specific message types
    unsubscribers.push(
      provider.onMessage('server.heartbeat', (payload: any) => {
        console.log('[Showcase] Heartbeat received:', payload);
      })
    );

    unsubscribers.push(
      provider.onMessage('session.update', (payload: any) => {
        console.log('[Showcase] Session update:', payload);
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [provider]);

  const handleConnect = async () => {
    if (provider && !isConnected) {
      try {
        await provider.connect();
      } catch (error) {
        console.error('Failed to connect:', error);
      }
    }
  };

  const handleDisconnect = () => {
    if (provider && isConnected) {
      provider.disconnect();
    }
  };

  const handleSendMessage = () => {
    if (provider && isConnected && customMessage) {
      provider.send({
        type: 'custom.message',
        payload: { text: customMessage, timestamp: Date.now() }
      });
      setCustomMessage('');
    }
  };

  const handleSendAndWait = async () => {
    if (provider && isConnected) {
      try {
        const response = await provider.sendAndWait({
          type: 'session.start',
          payload: { passageId: 'demo-123' }
        }, 5000);
        console.log('Received response:', response);
      } catch (error) {
        console.error('Request failed:', error);
      }
    }
  };

  const handleSimulateDisconnect = () => {
    if (isDemoProvider && provider) {
      provider.simulateDisconnect();
    }
  };

  const handleSimulateError = () => {
    if (isDemoProvider && provider) {
      provider.simulateError({
        code: 'SIMULATED_ERROR',
        message: 'This is a simulated error for testing'
      });
    }
  };

  const getStateColor = (state: WebSocketState) => {
    switch (state) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'reconnecting': return 'text-orange-600';
      case 'disconnected': return 'text-gray-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStateBadge = (state: WebSocketState) => {
    const colors = {
      connected: 'bg-green-100 text-green-800',
      connecting: 'bg-yellow-100 text-yellow-800',
      reconnecting: 'bg-orange-100 text-orange-800',
      disconnected: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[state]}`}>
        {state.toUpperCase()}
      </span>
    );
  };

  if (!provider) {
    return (
      <ShowcaseContainer
        title="WebSocket Connection"
        description="WebSocket provider not available. Check your provider configuration."
      >
        <div className="p-8 bg-yellow-50 rounded-lg text-yellow-800">
          <p>WebSocket provider is not configured. Add it to your providers config to use this showcase.</p>
        </div>
      </ShowcaseContainer>
    );
  }

  return (
    <ShowcaseContainer
      title="WebSocket Connection"
      description="Real-time bidirectional communication with automatic reconnection"
    >
      <ShowcaseSection
        title="Connection Status"
        description="Monitor WebSocket connection state and health"
      >
        <div className="space-y-4">
          {/* Connection State */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-700">Connection State</h4>
              <p className={`text-2xl font-bold ${getStateColor(connectionState)}`}>
                {connectionState}
              </p>
            </div>
            {getStateBadge(connectionState)}
          </div>

          {/* Connection Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-sm text-blue-600">Provider Type</div>
              <div className="font-medium">{provider.type}</div>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <div className="text-sm text-purple-600">Reconnect Attempts</div>
              <div className="font-medium">{reconnectAttempts}</div>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <div className="text-sm text-green-600">Messages Sent</div>
              <div className="font-medium">{messageHistory.length}</div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800 mb-1">Connection Error</h4>
              <p className="text-sm text-red-700">{error.code}: {error.message}</p>
            </div>
          )}

          {/* Connection Controls */}
          <div className="flex gap-2">
            <button
              onClick={handleConnect}
              disabled={isConnected || connectionState === 'connecting'}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect
            </button>
            <button
              onClick={handleDisconnect}
              disabled={!isConnected}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Disconnect
            </button>
            {isDemoProvider && (
              <>
                <button
                  onClick={handleSimulateDisconnect}
                  disabled={!isConnected}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Simulate Disconnect
                </button>
                <button
                  onClick={handleSimulateError}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Simulate Error
                </button>
              </>
            )}
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="Message Testing"
        description="Send messages and test request/response patterns"
      >
        <div className="space-y-4">
          {/* Custom Message Sender */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Enter a message to send..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!isConnected}
            />
            <button
              onClick={handleSendMessage}
              disabled={!isConnected || !customMessage}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Message
            </button>
          </div>

          {/* Pre-defined Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSendAndWait}
              disabled={!isConnected}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Session (Request/Response)
            </button>
            <button
              onClick={() => provider.send({ type: 'ping' })}
              disabled={!isConnected}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Ping
            </button>
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="Message History"
        description="Recent WebSocket messages (newest first)"
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {messageHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No messages yet</p>
          ) : (
            [...messageHistory].reverse().map((message, index) => (
              <div
                key={`${message.timestamp}-${index}`}
                className="p-3 bg-gray-50 rounded border border-gray-200 font-mono text-sm"
              >
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-blue-600">{message.type}</span>
                  <span className="text-gray-500 text-xs">
                    {new Date(message.timestamp || 0).toLocaleTimeString()}
                  </span>
                </div>
                {message.payload && (
                  <pre className="text-xs text-gray-700 overflow-x-auto">
                    {JSON.stringify(message.payload, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="Implementation Notes"
        description="Key features of the WebSocket provider"
      >
        <div className="prose prose-sm max-w-none">
          <ul>
            <li>✓ Automatic reconnection with exponential backoff</li>
            <li>✓ Message queuing during disconnection</li>
            <li>✓ Request/response pattern with timeouts</li>
            <li>✓ Heartbeat mechanism for connection health</li>
            <li>✓ Redux integration for state management</li>
            <li>✓ Event-based subscription system</li>
            <li>✓ Type-safe message handlers</li>
            <li>✓ Demo mode for testing without backend</li>
          </ul>
        </div>
      </ShowcaseSection>
    </ShowcaseContainer>
  );
}
