import type { Receptor } from "~/ecosystem/Receptor";
import type { HeartbeatEvent, ConnectionEstablishedEvent } from "../event";

/**
 * Transport events union type.
 */
export type TransportEvent = HeartbeatEvent | ConnectionEstablishedEvent;

/**
 * TransportReceptor - Transforms connection EnvironmentEvents to RuntimeEvents.
 *
 * Listens for:
 * - connected → ConnectionEstablishedEvent
 * - disconnected → (triggers cleanup)
 *
 * Also emits:
 * - heartbeat: SSE keepalive signal
 */
export interface TransportReceptor extends Receptor {}
