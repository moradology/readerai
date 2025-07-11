/**
 * WebSocket Service Core
 *
 * Responsibilities:
 * - Establish and maintain WebSocket connections
 * - Handle connection lifecycle (connect, disconnect, reconnect)
 * - Implement message queuing for offline resilience
 * - Provide typed message sending and receiving
 * - Manage subscription-based event handling
 * - Handle authentication and connection parameters
 * - Implement heartbeat/ping-pong for connection health
 */

import type { WebSocketMessage } from '@providers/types';

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  protocols?: string[];
}

export interface WebSocketServiceOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private messageQueue: WebSocketMessage[] = [];
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private shouldReconnect = true;

  // Event handlers
  private connectHandlers = new Set<() => void>();
  private disconnectHandlers = new Set<() => void>();
  private errorHandlers = new Set<(error: Error) => void>();
  private messageHandlers = new Set<(message: WebSocketMessage) => void>();

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      heartbeatInterval: config.heartbeatInterval || 30000,
      protocols: config.protocols,
    };
  }

  // Connection management
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;

    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols);
      this.setupEventListeners();
    } catch (error) {
      this.isConnecting = false;
      this.handleError(error as Error);
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.cleanup();
  }

  private cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnecting = false;
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      // eslint-disable-next-line no-console
      console.log('[WebSocket] Connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.flushMessageQueue();
      this.startHeartbeat();
      this.notifyConnect();
    };

    this.ws.onclose = (event) => {
      // eslint-disable-next-line no-console
      console.log('[WebSocket] Disconnected', event.code, event.reason);
      this.isConnecting = false;
      this.stopHeartbeat();
      this.notifyDisconnect();

      if (this.shouldReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      // eslint-disable-next-line no-console
      console.error('[WebSocket] Error', event);
      this.handleError(new Error('WebSocket error'));
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        this.handleMessage(message);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[WebSocket] Failed to parse message', error);
      }
    };
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);

    // eslint-disable-next-line no-console
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Message handling
  send(message: WebSocketMessage): void {
    const messageWithDefaults: WebSocketMessage = {
      ...message,
      id: message.id || `msg-${Date.now()}-${Math.random()}`,
      timestamp: message.timestamp || Date.now(),
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(messageWithDefaults));
    } else {
      // Queue message for later delivery
      this.messageQueue.push(messageWithDefaults);
      // eslint-disable-next-line no-console
      console.log('[WebSocket] Message queued (not connected)', messageWithDefaults.type);
    }
  }

  private flushMessageQueue(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach(message => {
      this.ws!.send(JSON.stringify(message));
    });

    if (queue.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`[WebSocket] Flushed ${queue.length} queued messages`);
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    // Handle system messages
    if (message.type === 'PONG') {
      return; // Heartbeat response
    }

    // Notify all message handlers
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[WebSocket] Error in message handler', error);
      }
    });
  }

  // Heartbeat
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'PING' });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Event subscriptions
  onConnect(handler: () => void): () => void {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  onDisconnect(handler: () => void): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  onError(handler: (error: Error) => void): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  onMessage(handler: (message: WebSocketMessage) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  // Private notification methods
  private notifyConnect(): void {
    this.connectHandlers.forEach(handler => handler());
  }

  private notifyDisconnect(): void {
    this.disconnectHandlers.forEach(handler => handler());
  }

  private handleError(error: Error): void {
    this.errorHandlers.forEach(handler => handler(error));
  }

  // State getters
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  getQueuedMessageCount(): number {
    return this.messageQueue.length;
  }
}
