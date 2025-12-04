/**
 * PeerEnvironment - Peer-based Environment implementation
 *
 * Combines PeerReceptor and PeerEffector to create a complete
 * Environment that bridges a Peer to the SystemBus.
 *
 * This enables Mirror functionality:
 * - Receptor: upstream events -> SystemBus
 * - Effector: SystemBus -> downstream broadcast, downstream -> upstream
 */

import type { Environment, Peer } from "@agentxjs/types";
import { PeerReceptor } from "./PeerReceptor";
import { PeerEffector } from "./PeerEffector";

/**
 * PeerEnvironment - Bridges Peer <-> SystemBus
 */
export class PeerEnvironment implements Environment {
  readonly name = "peer";
  readonly receptor: PeerReceptor;
  readonly effector: PeerEffector;

  constructor(peer: Peer) {
    this.receptor = new PeerReceptor(peer);
    this.effector = new PeerEffector(peer);
  }
}
