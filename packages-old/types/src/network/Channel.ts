/**
 * Network Channel Abstraction
 *
 * Provides transport-agnostic interfaces for client-server communication.
 * Can be implemented with WebSocket, HTTP/2, gRPC, etc.
 */

/**
 * Minimal HTTP server interface for attaching WebSocket
 * Avoids Node.js dependency in types package
 */
export interface MinimalHTTPServer {
  on(event: "upgrade", listener: (request: any, socket: any, head: any) => void): void;
}

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * Options for reliable message sending
 */
export interface SendReliableOptions {
  /**
   * Callback when client acknowledges receipt
   */
  onAck?: () => void;

  /**
   * Timeout in milliseconds (default: 5000)
   */
  timeout?: number;

  /**
   * Callback when ACK times out
   */
  onTimeout?: () => void;
}

/**
 * Channel connection (server-side representation of a client)
 */
export interface ChannelConnection {
  /**
   * Unique connection ID
   */
  readonly id: string;

  /**
   * Send message to this client (fire-and-forget)
   */
  send(message: string): void;

  /**
   * Send message with acknowledgment
   *
   * The message is wrapped with a unique ID. Client automatically sends ACK
   * when received. Server triggers onAck callback upon receiving ACK.
   *
   * This is handled transparently by the Network layer - clients don't need
   * to implement any special protocol.
   *
   * @param message - Message to send
   * @param options - ACK options (onAck callback, timeout, etc.)
   */
  sendReliable(message: string, options?: SendReliableOptions): void;

  /**
   * Register message handler
   */
  onMessage(handler: (message: string) => void): Unsubscribe;

  /**
   * Register close handler
   */
  onClose(handler: () => void): Unsubscribe;

  /**
   * Register error handler
   */
  onError(handler: (error: Error) => void): Unsubscribe;

  /**
   * Close this connection
   */
  close(): void;
}

/**
 * Channel server (accepts connections)
 */
export interface ChannelServer {
  /**
   * Start listening on a port (standalone mode)
   */
  listen(port: number, host?: string): Promise<void>;

  /**
   * Attach to an existing HTTP server
   */
  attach(server: MinimalHTTPServer, path?: string): void;

  /**
   * Register connection handler
   */
  onConnection(handler: (connection: ChannelConnection) => void): Unsubscribe;

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: string): void;

  /**
   * Close server and all connections
   */
  close(): Promise<void>;

  /**
   * Dispose resources
   */
  dispose(): Promise<void>;
}

/**
 * Channel client (connects to server)
 */
export interface ChannelClient {
  /**
   * Connection state
   */
  readonly readyState: "connecting" | "open" | "closing" | "closed";

  /**
   * Connect to server
   */
  connect(): Promise<void>;

  /**
   * Send message to server
   */
  send(message: string): void;

  /**
   * Register message handler
   */
  onMessage(handler: (message: string) => void): Unsubscribe;

  /**
   * Register open handler
   */
  onOpen(handler: () => void): Unsubscribe;

  /**
   * Register close handler
   */
  onClose(handler: () => void): Unsubscribe;

  /**
   * Register error handler
   */
  onError(handler: (error: Error) => void): Unsubscribe;

  /**
   * Close connection
   */
  close(): void;

  /**
   * Dispose resources
   */
  dispose(): void;
}

/**
 * Channel client factory options
 */
export interface ChannelClientOptions {
  /**
   * Server URL
   */
  serverUrl: string;

  /**
   * Enable auto-reconnect (default: true in browser, false in Node.js)
   */
  autoReconnect?: boolean;

  /**
   * Min reconnection delay in ms (default: 1000)
   */
  minReconnectionDelay?: number;

  /**
   * Max reconnection delay in ms (default: 10000)
   */
  maxReconnectionDelay?: number;

  /**
   * Max retry attempts (default: Infinity)
   */
  maxRetries?: number;

  /**
   * Connection timeout in ms (default: 4000)
   */
  connectionTimeout?: number;

  /**
   * Enable debug logging (default: false)
   */
  debug?: boolean;

  /**
   * Custom headers for WebSocket connection
   *
   * - Node.js: Headers are sent during WebSocket handshake
   * - Browser: Headers are sent in first authentication message (WebSocket API limitation)
   *
   * Supports both static values and dynamic functions (sync or async).
   */
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
}

/**
 * Channel server factory options
 */
export interface ChannelServerOptions {
  /**
   * Enable heartbeat/ping-pong (default: true)
   */
  heartbeat?: boolean;

  /**
   * Heartbeat interval in ms (default: 30000)
   */
  heartbeatInterval?: number;

  /**
   * Enable debug logging (default: false)
   */
  debug?: boolean;
}
