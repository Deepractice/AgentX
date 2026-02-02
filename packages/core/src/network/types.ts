/**
 * Network Types - Channel interfaces for client-server communication
 *
 * Provides transport-agnostic interfaces that can be implemented with:
 * - WebSocket (Node.js, Browser)
 * - Durable Objects WebSocket (Cloudflare Workers)
 * - HTTP/2, gRPC, etc.
 */

// ============================================================================
// Common Types
// ============================================================================

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * Minimal HTTP server interface for attaching WebSocket
 * Avoids Node.js dependency in types package
 */
export interface MinimalHTTPServer {
  on(event: "upgrade", listener: (request: unknown, socket: unknown, head: unknown) => void): void;
}

// ============================================================================
// Reliable Message Options
// ============================================================================

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

// ============================================================================
// Channel Connection (Server-side)
// ============================================================================

/**
 * ChannelConnection - Server-side representation of a client connection
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
   * This is handled transparently by the Network layer.
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

// ============================================================================
// Channel Server
// ============================================================================

/**
 * ChannelServer - Accepts client connections
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
 * ChannelServerOptions - Server configuration
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

// ============================================================================
// Channel Client
// ============================================================================

/**
 * Connection state
 */
export type ConnectionState = "connecting" | "open" | "closing" | "closed";

/**
 * ChannelClient - Connects to server
 */
export interface ChannelClient {
  /**
   * Connection state
   */
  readonly readyState: ConnectionState;

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
 * ChannelClientOptions - Client configuration
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
   * - Browser: Headers are sent in first authentication message
   */
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
}

// ============================================================================
// Channel Provider
// ============================================================================

/**
 * ChannelServerProvider - Factory for creating ChannelServer instances
 */
export interface ChannelServerProvider {
  createServer(options?: ChannelServerOptions): ChannelServer;
}

/**
 * ChannelClientProvider - Factory for creating ChannelClient instances
 */
export interface ChannelClientProvider {
  createClient(options: ChannelClientOptions): ChannelClient;
}
