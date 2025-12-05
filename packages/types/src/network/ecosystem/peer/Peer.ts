/**
 * Peer - Bidirectional network node for Ecosystem communication
 *
 * Peer is the network abstraction that enables Ecosystem-to-Ecosystem communication.
 * A Peer can act as both client (upstream) and server (downstream), enabling
 * chain-style mirroring architectures.
 *
 * ## Architecture
 *
 * ```
 * Claude SDK <-- ecosystem <-- mirror <-- mirror <-- Browser
 *                 (source)     (relay)    (relay)    (terminal)
 *
 * Each node is a Peer:
 * - ecosystem: downstream only (serves mirrors)
 * - mirror: upstream + downstream (relays events)
 * - browser: upstream only (connects to mirror)
 * ```
 *
 * ## Relationship with Environment
 *
 * Peer is a network primitive. In the Ecosystem layer, it's wrapped as
 * PeerEnvironment which implements the Environment interface:
 *
 * ```
 * ecosystem package:
 *   ClaudeEnvironment (Receptor + Effector) --> Claude SDK
 *
 * mirror package:
 *   PeerEnvironment (Receptor + Effector) --> Peer --> Network
 * ```
 *
 * @example
 * ```typescript
 * // Source ecosystem - downstream only
 * const peer = createWebSocketPeer();
 * await peer.listenDownstream({ port: 5200 });
 *
 * peer.onDownstreamConnection((connection) => {
 *   console.log("Mirror connected");
 * });
 *
 * peer.broadcast(event); // Send to all downstream connections
 *
 * // Relay mirror - both upstream and downstream
 * const peer = createWebSocketPeer();
 * await peer.connectUpstream({ url: "ws://source:5200" });
 * await peer.listenDownstream({ port: 5201 });
 *
 * peer.onUpstreamEvent((event) => {
 *   peer.broadcast(event); // Forward to downstream
 * });
 *
 * // Terminal browser - upstream only
 * const peer = createWebSocketPeer();
 * await peer.connectUpstream({ url: "ws://mirror:5201" });
 *
 * peer.onUpstreamEvent((event) => {
 *   console.log("Received:", event.type);
 * });
 *
 * peer.sendUpstream(event); // Send to upstream
 * ```
 */

import type { EnvironmentEvent } from "~/event";

// ============================================================================
// Types
// ============================================================================

/**
 * Peer connection state
 */
export type PeerState = "disconnected" | "connecting" | "connected" | "reconnecting";

/**
 * Peer server state
 */
export type PeerServerState = "stopped" | "starting" | "listening" | "stopping";

/**
 * Upstream connection configuration
 */
export interface UpstreamConfig {
  /**
   * WebSocket URL to connect to
   */
  url: string;

  /**
   * Optional query parameters (for authentication)
   */
  params?: Record<string, string>;

  /**
   * Reconnection options
   */
  reconnect?: {
    /** Enable auto-reconnect (default: true) */
    enabled?: boolean;
    /** Initial delay in ms (default: 1000) */
    delay?: number;
    /** Max delay in ms (default: 30000) */
    maxDelay?: number;
    /** Max attempts (default: Infinity) */
    maxAttempts?: number;
  };
}

/**
 * Downstream server configuration
 */
export interface DownstreamConfig {
  /**
   * Port to listen on
   */
  port: number;

  /**
   * Host to bind to (default: "0.0.0.0")
   */
  host?: string;

  /**
   * Path for WebSocket endpoint (default: "/")
   */
  path?: string;
}

/**
 * Downstream connection - represents a connected client
 */
export interface DownstreamConnection {
  /**
   * Unique connection ID
   */
  readonly id: string;

  /**
   * Connection state
   */
  readonly state: PeerState;

  /**
   * Send event to this specific connection
   */
  send(event: EnvironmentEvent): void;

  /**
   * Disconnect this connection
   */
  disconnect(): void;

  /**
   * Subscribe to events from this connection
   */
  onEvent(handler: PeerEventHandler): PeerUnsubscribe;

  /**
   * Subscribe to state changes
   */
  onStateChange(handler: PeerStateHandler): PeerUnsubscribe;
}

/**
 * Event handler
 */
export type PeerEventHandler = (event: EnvironmentEvent) => void;

/**
 * State change handler
 */
export type PeerStateHandler = (state: PeerState) => void;

/**
 * Server state change handler
 */
export type PeerServerStateHandler = (state: PeerServerState) => void;

/**
 * Downstream connection handler
 */
export type DownstreamConnectionHandler = (connection: DownstreamConnection) => void;

/**
 * Unsubscribe function
 */
export type PeerUnsubscribe = () => void;

// ============================================================================
// Peer Interface
// ============================================================================

/**
 * Peer - Bidirectional network node
 *
 * Can act as:
 * - Client: connects to upstream peer
 * - Server: accepts downstream connections
 * - Both: relay node in a chain
 */
export interface Peer {
  // ==========================================================================
  // Upstream (as client)
  // ==========================================================================

  /**
   * Upstream connection state
   */
  readonly upstreamState: PeerState;

  /**
   * Connect to upstream peer
   */
  connectUpstream(config: UpstreamConfig): Promise<void>;

  /**
   * Disconnect from upstream peer
   */
  disconnectUpstream(): void;

  /**
   * Send event to upstream peer
   */
  sendUpstream(event: EnvironmentEvent): void;

  /**
   * Subscribe to events from upstream
   */
  onUpstreamEvent(handler: PeerEventHandler): PeerUnsubscribe;

  /**
   * Subscribe to upstream state changes
   */
  onUpstreamStateChange(handler: PeerStateHandler): PeerUnsubscribe;

  // ==========================================================================
  // Downstream (as server)
  // ==========================================================================

  /**
   * Downstream server state
   */
  readonly downstreamState: PeerServerState;

  /**
   * Start listening for downstream connections
   */
  listenDownstream(config: DownstreamConfig): Promise<void>;

  /**
   * Stop listening and close all downstream connections
   */
  closeDownstream(): Promise<void>;

  /**
   * Broadcast event to all downstream connections
   */
  broadcast(event: EnvironmentEvent): void;

  /**
   * Subscribe to new downstream connections
   */
  onDownstreamConnection(handler: DownstreamConnectionHandler): PeerUnsubscribe;

  /**
   * Subscribe to downstream server state changes
   */
  onDownstreamStateChange(handler: PeerServerStateHandler): PeerUnsubscribe;

  /**
   * Get all active downstream connections
   */
  readonly downstreamConnections: ReadonlyArray<DownstreamConnection>;

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Dispose the peer and clean up all resources
   */
  dispose(): void;
}
