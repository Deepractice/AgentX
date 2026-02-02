/**
 * AgentLifecycle - Runtime Agent lifecycle states
 *
 * - running: Agent is active, can receive messages
 * - stopped: Agent is paused, session data preserved, can resume
 * - destroyed: Agent is removed, all data cleaned up
 */
export type AgentLifecycle = "running" | "stopped" | "destroyed";
