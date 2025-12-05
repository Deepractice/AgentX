/**
 * Effector - Listens to SystemBus and acts upon external world
 *
 * From systems theory:
 * - An effector is a component that produces an effect on the environment
 * - It transforms internal signals into external actions
 *
 * In our architecture:
 * - Effector subscribes to SystemBus
 * - Sends commands/events to external world (LLM API, Network, other systems)
 *
 * ```
 *    SystemBus
 *        │
 *        │ subscribe
 *        ▼
 *    Effector
 *        │
 *        │ send
 *        ▼
 *   External World
 * ```
 *
 * @see issues/030-ecosystem-architecture.md
 */

import type { SystemBus } from "../event/SystemBus";

/**
 * Effector - Subscribes to SystemBus and acts upon external world
 */
export interface Effector {
  /**
   * Subscribe to SystemBus
   */
  subscribe(bus: SystemBus): void;
}
