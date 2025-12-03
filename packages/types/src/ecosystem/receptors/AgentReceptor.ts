import type { Receptor } from "~/ecosystem/Receptor";
import type { AgentStartedEvent, AgentReadyEvent, AgentDestroyedEvent } from "../event";

/**
 * Agent lifecycle events union type.
 */
export type AgentLifecycleEvent = AgentStartedEvent | AgentReadyEvent | AgentDestroyedEvent;

/**
 * AgentReceptor - Emits agent lifecycle RuntimeEvents.
 *
 * Responsible for emitting:
 * - agent_started: Agent entered the ecosystem
 * - agent_ready: Agent is ready to receive messages
 * - agent_destroyed: Agent left the ecosystem
 */
export interface AgentReceptor extends Receptor {}
