/**
 * MirrorEcosystem - Peer-based relay node for chain topology
 *
 * Creates a Mirror node that:
 * - Connects to upstream (Ecosystem or another Mirror)
 * - Optionally serves downstream (Browser or another Mirror)
 * - Relays events bidirectionally through SystemBus
 *
 * Topology: Ecosystem <- Mirror <- Mirror <- Browser
 *
 * @example
 * ```typescript
 * import { createMirror } from "@agentxjs/mirror";
 *
 * // Create relay node
 * const mirror = createMirror({
 *   upstream: { url: "ws://ecosystem:5200" },
 *   downstream: { port: 5201 },
 * });
 *
 * await mirror.start();
 *
 * // Now browsers can connect to ws://mirror:5201
 * // Events flow: Ecosystem <-> Mirror <-> Browser
 * ```
 */

import type {
  SystemBus,
  Environment,
  Peer,
  PeerState,
  PeerServerState,
  UpstreamConfig,
  DownstreamConfig,
} from "@agentxjs/types";
import { createWebSocketPeer } from "@agentxjs/network";
import { createLogger } from "@agentxjs/common";
import { SystemBusImpl } from "./SystemBusImpl";
import { PeerEnvironment } from "./environment";

const logger = createLogger("mirror/MirrorEcosystem");

/**
 * MirrorEcosystem configuration
 */
export interface MirrorConfig {
  /**
   * Upstream connection config (required)
   * Connect to Ecosystem or another Mirror
   */
  upstream: UpstreamConfig;

  /**
   * Downstream server config (optional)
   * Serve downstream connections (browsers, other mirrors)
   * If not provided, Mirror acts as terminal node (client only)
   */
  downstream?: DownstreamConfig;
}

/**
 * MirrorEcosystem - Relay node in chain topology
 */
export class MirrorEcosystem {
  /**
   * Central event bus for internal routing
   */
  readonly bus: SystemBus;

  /**
   * Peer-based environment (Receptor + Effector)
   */
  readonly environment: Environment;

  /**
   * Underlying network peer
   */
  readonly peer: Peer;

  private readonly config: MirrorConfig;

  constructor(config: MirrorConfig) {
    this.config = config;

    // 1. Create SystemBus
    this.bus = new SystemBusImpl();

    // 2. Create Peer
    this.peer = createWebSocketPeer();

    // 3. Create PeerEnvironment to bridge Peer <-> SystemBus
    this.environment = new PeerEnvironment(this.peer);

    // 4. Connect environment to bus
    this.environment.receptor.emit(this.bus);
    this.environment.effector.subscribe(this.bus);

    logger.debug("MirrorEcosystem created");
  }

  /**
   * Current upstream connection state
   */
  get upstreamState(): PeerState {
    return this.peer.upstreamState;
  }

  /**
   * Current downstream server state
   */
  get downstreamState(): PeerServerState {
    return this.peer.downstreamState;
  }

  /**
   * Start the Mirror node
   *
   * 1. Connect to upstream
   * 2. Start downstream server (if configured)
   */
  async start(): Promise<void> {
    logger.info("Starting MirrorEcosystem");

    // Connect to upstream
    await this.peer.connectUpstream(this.config.upstream);
    logger.info("Connected to upstream", { url: this.config.upstream.url });

    // Start downstream server if configured
    if (this.config.downstream) {
      await this.peer.listenDownstream(this.config.downstream);
      logger.info("Downstream server listening", {
        port: this.config.downstream.port,
      });
    }
  }

  /**
   * Stop the Mirror node
   *
   * 1. Close downstream server
   * 2. Disconnect from upstream
   */
  async stop(): Promise<void> {
    logger.info("Stopping MirrorEcosystem");

    // Close downstream first (graceful shutdown)
    if (this.config.downstream) {
      await this.peer.closeDownstream();
    }

    // Disconnect upstream
    this.peer.disconnectUpstream();

    logger.info("MirrorEcosystem stopped");
  }

  /**
   * Dispose the ecosystem and clean up all resources
   */
  dispose(): void {
    logger.info("Disposing MirrorEcosystem");
    this.peer.dispose();
    this.bus.destroy();
  }
}

/**
 * Create a Mirror Ecosystem
 *
 * @example
 * ```typescript
 * // Full relay node
 * const mirror = createMirror({
 *   upstream: { url: "ws://ecosystem:5200" },
 *   downstream: { port: 5201 },
 * });
 *
 * // Client-only node (no downstream)
 * const client = createMirror({
 *   upstream: { url: "ws://mirror:5201" },
 * });
 * ```
 */
export function createMirror(config: MirrorConfig): MirrorEcosystem {
  return new MirrorEcosystem(config);
}
