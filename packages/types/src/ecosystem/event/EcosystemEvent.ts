/**
 * Base interface for all Ecosystem Events.
 *
 * Ecosystem Events are externally observable events that occur in the agent ecosystem.
 * Unlike Domain Events (internal to agent), Ecosystem Events are designed to be
 * transmitted across boundaries (e.g., via SSE to browsers).
 *
 * From systems theory perspective:
 * - Receptors sense signals and convert them to Ecosystem Events
 * - Observers subscribe to these events to understand ecosystem state
 *
 * This is a pure abstraction. Concrete event structure is defined in runtime/event/.
 */
export interface EcosystemEvent<T extends string = string, D = unknown> {
  /** Event type identifier */
  readonly type: T;

  /** Event timestamp in milliseconds */
  readonly timestamp: number;

  /** Event-specific data payload */
  readonly data: D;
}
