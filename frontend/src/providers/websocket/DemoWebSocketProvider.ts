/**
 * Demo WebSocket Provider
 *
 * Simulates WebSocket behavior for development and testing:
 * - Simulated connection states and delays
 * - Mock message generation
 * - Controllable disconnections
 * - Predictable reconnection behavior
 */

import type {
  WebSocketProvider,
  WebSocketMessage,
  WebSocketState,
  WebSocketError,
  WebSocketConfig
} from '@providers/types';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timeout: NodeJS.Timeout;
}

export class DemoWebSocketProvider implements WebSocketProvider {
  readonly name = 'DemoWebSocketProvider';
  readonly version = '1.0.0';
  readonly type = 'demo' as const;

  private state: WebSocketState = 'disconnected';
  private eventHandlers = new Map<string, Set<Function>>();
  private messageHandlers = new Map<string, Set<Function>>();
  private pendingRequests = new Map<string, PendingRequest>();
  private simulationInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private messageSimulators: NodeJS.Timeout[] = [];

  // Demo control properties
  private shouldFailConnection = false;
  private connectionDelay = 500;
  private reconnectCount = 0;

  constructor(private config: WebSocketConfig) {}

  async initialize(): Promise<void> {
    await this.connect();
  }

  cleanup(): void {
    this.disconnect();
    this.eventHandlers.clear();
    this.messageHandlers.clear();
    this.pendingRequests.forEach(({ timeout, reject }) => {
      clearTimeout(timeout);
      reject(new Error('Provider cleanup'));
    });
    this.pendingRequests.clear();
    this.messageSimulators.forEach(timer => clearTimeout(timer));
    this.messageSimulators = [];
  }

  isReady(): boolean {
    return this.state === 'connected';
  }

  async connect(): Promise<void> {
    if (this.state === 'connecting' || this.state === 'connected') {
      return;
    }

    this.setState('connecting');

    // Simulate connection delay
    await new Promise(resolve => {
      this.connectionTimeout = setTimeout(resolve, this.connectionDelay);
    });

    if (this.shouldFailConnection) {
      this.setState('error');
      this.emitError({
        code: 'CONNECTION_FAILED',
        message: 'Demo connection failed (simulated)',
      });
      throw new Error('Connection failed');
    }

    this.setState('connected');
    this.reconnectCount = 0;
    this.startSimulation();
  }

  disconnect(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    this.stopSimulation();
    this.setState('disconnected');
  }

  send<T = any>(message: WebSocketMessage<T>): void {
    const enrichedMessage: WebSocketMessage<T> = {
      ...message,
      id: message.id || this.generateId(),
      timestamp: message.timestamp || Date.now(),
    };

    if (this.state !== 'connected') {
      console.warn('[DemoWebSocket] Cannot send message - not connected');
      return;
    }

    // Simulate echo for certain message types
    setTimeout(() => {
      this.simulateResponse(enrichedMessage);
    }, 50);
  }

  async sendAndWait<T = any, R = any>(
    message: WebSocketMessage<T>,
    timeoutMs?: number
  ): Promise<R> {
    const id = this.generateId();
    const enrichedMessage: WebSocketMessage<T> = {
      ...message,
      id,
      timestamp: Date.now(),
    };

    return new Promise<R>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${message.type}`));
      }, timeoutMs || 5000);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.send(enrichedMessage);
    });
  }

  getState(): WebSocketState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  on(event: string, handler: Function): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)!.add(handler);

    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  onMessage<T = any>(type: string, handler: (payload: T) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    this.messageHandlers.get(type)!.add(handler);

    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  // Demo control methods
  simulateDisconnect(): void {
    if (this.state === 'connected') {
      this.disconnect();
      this.emit('message', {
        type: 'system',
        payload: { message: 'Connection lost (simulated)' }
      });

      // Simulate reconnection after delay
      if (this.config.reconnect && this.reconnectCount < 3) {
        setTimeout(() => {
          this.setState('reconnecting');
          this.reconnectCount++;
          setTimeout(() => {
            this.connect().catch(console.error);
          }, 1000 * this.reconnectCount);
        }, 500);
      }
    }
  }

  simulateError(error: WebSocketError): void {
    this.emitError(error);
  }

  setConnectionBehavior(shouldFail: boolean, delay: number = 500): void {
    this.shouldFailConnection = shouldFail;
    this.connectionDelay = delay;
  }

  // Private methods
  private setState(newState: WebSocketState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.emit('state', newState);

      // Log state transitions
      console.log(`[DemoWebSocket] State: ${oldState} → ${newState}`);
    }
  }

  private emit(event: string, data: any): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[DemoWebSocket] Error in ${event} handler:`, error);
      }
    });
  }

  private emitError(error: WebSocketError): void {
    this.emit('error', error);
  }

  private handleMessage(message: WebSocketMessage): void {
    this.emit('message', message);

    // Handle response to pending request
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, timeout } = this.pendingRequests.get(message.id)!;
      clearTimeout(timeout);
      this.pendingRequests.delete(message.id);
      resolve(message.payload);
      return;
    }

    // Handle typed message handlers
    this.messageHandlers.get(message.type)?.forEach(handler => {
      try {
        handler(message.payload);
      } catch (error) {
        console.error(`[DemoWebSocket] Error in ${message.type} handler:`, error);
      }
    });
  }

  private simulateResponse(originalMessage: WebSocketMessage): void {
    switch (originalMessage.type) {
      case 'ping':
        this.handleMessage({
          type: 'pong',
          id: originalMessage.id || '',
          timestamp: Date.now(),
        });
        break;

      case 'session.start':
        this.handleMessage({
          type: 'session.started',
          id: originalMessage.id || '',
          payload: {
            sessionId: 'demo-session-123',
            timestamp: Date.now(),
          },
        });
        break;

      case 'progress.update':
        this.handleMessage({
          type: 'progress.updated',
          id: originalMessage.id || '',
          payload: {
            success: true,
            ...originalMessage.payload,
          },
        });
        break;

      case 'interruption.create':
        // Simulate processing delay
        setTimeout(() => {
          this.handleMessage({
            type: 'interruption.response',
            id: originalMessage.id || '',
            payload: {
              response: 'This is a demo response to your question.',
              confidence: 0.95,
            },
          });
        }, 1000);
        break;
    }
  }

  private startSimulation(): void {
    // Simulate periodic server messages
    this.simulationInterval = setInterval(() => {
      if (this.state !== 'connected') return;

      const messages = [
        {
          type: 'server.heartbeat',
          payload: { timestamp: Date.now() },
        },
        {
          type: 'session.update',
          payload: {
            activeUsers: Math.floor(Math.random() * 100),
            serverLoad: Math.random(),
          },
        },
        {
          type: 'reading.highlight',
          payload: {
            wordIndex: Math.floor(Math.random() * 200),
            duration: 500,
          },
        },
      ];

      // Randomly send a message
      if (Math.random() > 0.7) {
        const messageIndex = Math.floor(Math.random() * messages.length);
        const message = messages[messageIndex];
        if (message) {
          this.handleMessage({
            type: message.type,
            payload: message.payload,
            timestamp: Date.now(),
          });
        }
      }
    }, 3000);
  }

  private stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
