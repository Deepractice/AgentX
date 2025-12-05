/**
 * MirrorRuntime - Browser-side Runtime implementation
 *
 * Implements Runtime interface for browser clients.
 * Communicates with server via WebSocket events.
 *
 * @example
 * ```typescript
 * const runtime = new MirrorRuntime({ serverUrl: "ws://localhost:5200" });
 * await runtime.connect();
 *
 * runtime.on((event) => {
 *   console.log("Event:", event);
 * });
 *
 * const container = runtime.createContainer("my-container");
 * const agent = await container.run(definition);
 * ```
 */

import type { Runtime, Unsubscribe, RuntimeEventHandler, Container, Peer } from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";
import { SystemBusImpl } from "./SystemBusImpl";
import { MirrorContainer } from "./MirrorContainer";

const logger = createLogger("mirror/MirrorRuntime");

/**
 * MirrorRuntime configuration
 */
export interface MirrorRuntimeConfig {
  /**
   * WebSocket server URL
   * @example "ws://localhost:5200"
   */
  serverUrl?: string;

  /**
   * Optional WebSocket peer (for custom peer implementation)
   */
  peer?: Peer;
}

/**
 * MirrorRuntime - Browser-side Runtime implementation
 *
 * Uses WebSocket for bidirectional communication with server.
 */
export class MirrorRuntime implements Runtime {
  private readonly bus: SystemBusImpl;
  private readonly config: MirrorRuntimeConfig;
  private readonly containers = new Map<string, MirrorContainer>();
  private peer: Peer | null = null;

  constructor(config: MirrorRuntimeConfig = {}) {
    this.config = config;
    this.bus = new SystemBusImpl();
    this.peer = config.peer ?? null;
    logger.debug("MirrorRuntime created", { serverUrl: config.serverUrl });
  }

  /**
   * Connect to the server via WebSocket
   *
   * Must be called before createContainer() if not using custom peer.
   */
  async connect(): Promise<void> {
    if (this.peer) {
      // Already have a peer
      if (this.peer.upstreamState === "connected") {
        return;
      }
      if (this.config.serverUrl) {
        await this.peer.connectUpstream({ url: this.config.serverUrl });
      }
      return;
    }

    if (!this.config.serverUrl) {
      throw new Error("serverUrl is required for connect()");
    }

    // In browser, we'd use a browser WebSocket peer
    // For now, throw an error - the caller should provide a peer
    throw new Error(
      "No peer provided. Pass a Peer instance via config.peer or use createWebSocketPeer() from @agentxjs/network"
    );
  }

  /**
   * Set the WebSocket peer (for dependency injection)
   */
  setPeer(peer: Peer): void {
    this.peer = peer;

    // Forward upstream events to local bus
    peer.onUpstreamEvent((event) => {
      this.bus.emit(event as { type: string });
    });
  }

  /**
   * Subscribe to all runtime events
   */
  on(handler: RuntimeEventHandler): Unsubscribe {
    return this.bus.onAny((event) => {
      handler(event);
    });
  }

  /**
   * Emit an event to the runtime
   */
  emit(event: unknown): void {
    this.bus.emit(event as { type: string });

    // Also send upstream if connected
    if (this.peer?.upstreamState === "connected") {
      this.peer.sendUpstream(event as any);
    }
  }

  /**
   * Create a Container for managing Agent instances
   *
   * Returns a MirrorContainer that proxies operations to server.
   */
  createContainer(containerId: string): Container {
    // Check cache
    const existing = this.containers.get(containerId);
    if (existing) {
      return existing;
    }

    if (!this.peer) {
      throw new Error("No peer connected. Call connect() or setPeer() first.");
    }

    // Create proxy container
    const container = new MirrorContainer(containerId, this.peer);
    this.containers.set(containerId, container);

    // Send create_container event to server
    this.peer.sendUpstream({
      type: "create_container",
      data: { containerId },
    } as any);

    logger.debug("Container created", { containerId });
    return container;
  }

  /**
   * Dispose the runtime and clean up resources
   */
  dispose(): void {
    logger.info("Disposing MirrorRuntime");

    // Dispose all containers
    for (const container of this.containers.values()) {
      container.dispose();
    }
    this.containers.clear();

    // Disconnect peer
    if (this.peer) {
      this.peer.disconnectUpstream();
    }

    this.bus.destroy();
  }

  /**
   * Get the underlying SystemBus (for advanced use)
   */
  getBus(): SystemBusImpl {
    return this.bus;
  }

  /**
   * Get the WebSocket peer
   */
  getPeer(): Peer | null {
    return this.peer;
  }

  /**
   * Get configuration
   */
  getConfig(): MirrorRuntimeConfig {
    return this.config;
  }
}
