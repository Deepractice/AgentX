/**
 * PeerEffector - Bridges SystemBus to Peer downstream
 *
 * Subscribes to SystemBus events and broadcasts to downstream connections.
 * Also forwards downstream connection events to upstream.
 *
 * This is the "action" side of the Mirror - sending to downstream and upstream.
 * Mirror is a transparent relay - it does not filter event types.
 */

import type { Effector, SystemBus, Peer, EnvironmentEvent } from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("mirror/PeerEffector");

/**
 * PeerEffector - SystemBus <-> Peer (transparent relay)
 */
export class PeerEffector implements Effector {
  constructor(private readonly peer: Peer) {}

  /**
   * Subscribe to SystemBus and manage bidirectional event flow
   */
  subscribe(bus: SystemBus): void {
    logger.debug("PeerEffector connecting SystemBus to Peer");

    // SystemBus -> Downstream broadcast (all events)
    bus.onAny((event) => {
      if (this.peer.downstreamState !== "listening") {
        return;
      }

      logger.debug("SystemBus event -> downstream broadcast", { type: event.type });
      this.peer.broadcast(event as EnvironmentEvent);
    });

    // Downstream connections -> Upstream (all events)
    this.peer.onDownstreamConnection((connection) => {
      logger.debug("New downstream connection", { connectionId: connection.id });

      connection.onEvent((event) => {
        if (this.peer.upstreamState !== "connected") {
          logger.warn("Cannot forward to upstream: not connected", {
            type: event.type,
            upstreamState: this.peer.upstreamState,
          });
          return;
        }

        logger.debug("Downstream event -> upstream", { type: event.type });
        this.peer.sendUpstream(event);
      });

      // Forward connection state to SystemBus
      connection.onStateChange((state) => {
        bus.emit({
          type: "downstream_connection_state",
          timestamp: Date.now(),
          data: {
            connectionId: connection.id,
            state,
          },
        } as any);
      });
    });

    // Forward downstream server state changes
    this.peer.onDownstreamStateChange((state) => {
      logger.debug("Downstream server state changed", { state });
      bus.emit({
        type: "connection_state",
        timestamp: Date.now(),
        data: {
          direction: "downstream",
          state,
        },
      } as any);
    });
  }
}
