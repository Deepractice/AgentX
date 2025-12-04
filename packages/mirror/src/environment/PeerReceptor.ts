/**
 * PeerReceptor - Bridges Peer upstream to SystemBus
 *
 * Listens to upstream events from Peer and emits to local SystemBus.
 * This is the "perception" side of the Mirror - receiving from upstream.
 */

import type { Receptor, SystemBus, Peer } from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("mirror/PeerReceptor");

/**
 * PeerReceptor - Peer upstream -> SystemBus
 */
export class PeerReceptor implements Receptor {
  constructor(private readonly peer: Peer) {}

  /**
   * Start emitting upstream events to SystemBus
   */
  emit(bus: SystemBus): void {
    logger.debug("PeerReceptor connecting upstream to SystemBus");

    // Forward all upstream events to local SystemBus
    this.peer.onUpstreamEvent((event) => {
      logger.debug("Upstream event -> SystemBus", { type: event.type });
      bus.emit(event);
    });

    // Forward upstream state changes as connection events
    this.peer.onUpstreamStateChange((state) => {
      logger.debug("Upstream state changed", { state });
      bus.emit({
        type: "connection_state",
        timestamp: Date.now(),
        data: {
          direction: "upstream",
          state,
        },
      } as any);
    });
  }
}
