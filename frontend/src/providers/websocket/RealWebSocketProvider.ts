/**
 * Real WebSocket Provider
 *
 * Production WebSocket implementation with:
 * - Automatic reconnection with exponential backoff
 * - Message queuing during disconnection
 * - Heartbeat/ping-pong for connection health
 * - Request/response pattern with timeouts
 * - Event emitter for flexible subscriptions
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

export class RealWebSocketProvider implements WebSocketProvider {
  readonly name = 'RealWebSocketProvider';
  readonly version = '1.0.0';
  readonly type = 'real' as const;

  private config: Required<WebSocketConfig>;
  private ws: WebSocket | null = null;
  private state: WebSocketState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private pendingRequests = new Map<string, PendingRequest>();
  private eventHandlers = new Map<string, Set<Function>>();
  private messageHandlers = new Map<string, Set<Function>>();
  private isCleaningUp = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      protocols: config.protocols || [],
      reconnect: config.reconnect ?? true,
      reconnectInterval: config.reconnectInterval ?? 1000,
      reconnectMaxRetries: config.reconnectMaxRetries ?? 10,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      messageTimeout: config.messageTimeout ?? 10000,
    };
  }

  async initialize(): Promise<void> {
    await this.connect();
  }

  cleanup(): void {
    this.isCleaningUp = true;
    this.disconnect();
    this.eventHandlers.clear();
    this.messageHandlers.clear();
    this.pendingRequests.forEach(({ timeout, reject }) => {
      clearTimeout(timeout);
      reject(new Error('Provider cleanup'));
    });
    this.pendingRequests.clear();
  }

  isReady(): boolean {
    return this.state === 'connected';
  }

  async connect(): Promise<void> {
    if (this.state === 'connecting' || this.state === 'connected') {
      return;
    }

    this.setState('connecting');

    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.setState('connected');
        this.reconnectAttempts = 0;
        this.flushMessageQueue();
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (event) => {
        console.error('[WebSocket] Error:', event);
        this.emitError({
          code: 'CONNECTION_ERROR',
          message: 'WebSocket connection error',
        });
      };

      this.ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        this.setState('disconnected');
        this.stopHeartbeat();

        if (!this.isCleaningUp && this.config.reconnect && this.reconnectAttempts < this.config.reconnectMaxRetries) {
          this.scheduleReconnect();
        }
      };

      // Wait for connection to establish
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, this.config.messageTimeout);

        const unsubscribe = this.on('state', (state: WebSocketState) => {
          if (state === 'connected') {
            clearTimeout(timeout);
            unsubscribe();
            resolve();
          }
        });
      });
    } catch (error) {
      this.setState('error');
      throw error;
    }
  }

  disconnect(): void {
    this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setState('disconnected');
  }

  send<T = any>(message: WebSocketMessage<T>): void {
    const enrichedMessage: WebSocketMessage<T> = {
      ...message,
      id: message.id || this.generateId(),
      timestamp: message.timestamp || Date.now(),
    };

    if (this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(enrichedMessage));
    } else {
      // Queue message for later delivery
      this.messageQueue.push(enrichedMessage);
    }
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
      }, timeoutMs || this.config.messageTimeout);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.send(enrichedMessage);
    });
  }

  getState(): WebSocketState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  on(event: string, handler: Function): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  onMessage<T = any>(type: string, handler: (payload: T) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    this.messageHandlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  private setState(newState: WebSocketState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.emit('state', newState);
    }
  }

  private emit(event: string, data: any): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[WebSocket] Error in ${event} handler:`, error);
      }
    });
  }

  private emitError(error: WebSocketError): void {
    this.emit('error', error);
  }

  private handleMessage(message: WebSocketMessage): void {
    // Emit raw message event
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
        console.error(`[WebSocket] Error in ${message.type} handler:`, error);
      }
    });

    // Handle special message types
    switch (message.type) {
      case 'pong':
        // Heartbeat response
        break;
      case 'error':
        this.emitError(message.payload as WebSocketError);
        break;
    }
  }

  private scheduleReconnect(): void {
    this.setState('reconnecting');

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(error => {
        console.error('[WebSocket] Reconnection failed:', error);
      });
    }, delay);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.send(message);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping' });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
