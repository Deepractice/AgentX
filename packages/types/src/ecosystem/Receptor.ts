/**
 * Receptor - Transforms EnvironmentEvents into RuntimeEvents
 *
 * From systems theory:
 * - A receptor is a sensory component that detects stimuli from the environment
 * - It transforms raw signals into a format the system can process
 *
 * In our architecture:
 * - Receptor listens to EnvironmentEvents on SystemBus
 * - Enriches them with context (agentId, timestamp, etc.)
 * - Emits RuntimeEvents back to SystemBus
 *
 * ```
 * EnvironmentEvent  →  Receptor  →  RuntimeEvent
 * (text_chunk)         (enrich)     (TextDeltaEnvEvent with agentId)
 * ```
 *
 * Receptors are the transformation boundary between external and internal events.
 *
 * @see issues/028-reactor-pattern-systembus-architecture.md
 */

import type { SystemBus } from "./SystemBus";

/**
 * Receptor - Listens to SystemBus, transforms and emits events
 */
export interface Receptor {
  /**
   * Start listening to SystemBus and transforming events
   *
   * The receptor will:
   * 1. Subscribe to relevant EnvironmentEvents on the bus
   * 2. Transform them into RuntimeEvents (add context)
   * 3. Emit RuntimeEvents back to the bus
   *
   * @param bus - SystemBus to listen and emit
   */
  start(bus: SystemBus): void;

  /**
   * Stop listening and clean up resources
   */
  stop(): void;
}
