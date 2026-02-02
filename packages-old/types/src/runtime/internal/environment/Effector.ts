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

import type { SystemBusConsumer } from "../event/SystemBusConsumer";

/**
 * Effector - Subscribes to SystemBus and acts upon external world
 */
export interface Effector {
  /**
   * Connect to SystemBus consumer to subscribe to events
   *
   * Effector only needs Consumer (read-only) because it only subscribes to events.
   */
  connect(consumer: SystemBusConsumer): void;
}
