/**
 * Receptor - Perceives the external world and emits to SystemBus
 *
 * From systems theory:
 * - A receptor is a sensory component that detects stimuli from outside
 * - It transforms external signals into events the system can process
 *
 * In our architecture:
 * - Receptor perceives external world (LLM API, Network, etc.)
 * - Emits events to SystemBus
 *
 * ```
 *   External World
 *        │
 *        │ perceive
 *        ▼
 *    Receptor
 *        │
 *        │ emit
 *        ▼
 *    SystemBus
 * ```
 *
 * @see issues/030-ecosystem-architecture.md
 */

import type { SystemBusProducer } from "../event/SystemBusProducer";

/**
 * Receptor - Perceives external world and emits events to SystemBus
 */
export interface Receptor {
  /**
   * Connect to SystemBus producer to emit events
   *
   * Receptor only needs Producer (write-only) because it only emits events.
   */
  connect(producer: SystemBusProducer): void;
}
