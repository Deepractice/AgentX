/**
 * AgentOutputCallback - Event subscription callback types
 *
 * Callback function types for subscribing to AgentOutput events.
 * Renamed from AgentEventHandler to avoid confusion with Handler classes.
 */

import type { AgentOutput } from "../AgentOutput";

/**
 * Unsubscribe function returned by on()
 */
export type Unsubscribe = () => void;

/**
 * Agent output event callback function type
 */
export type AgentOutputCallback<T extends AgentOutput = AgentOutput> = (event: T) => void;

/**
 * @deprecated Use AgentOutputCallback instead
 */
export type AgentEventHandler<T extends AgentOutput = AgentOutput> = AgentOutputCallback<T>;
