/**
 * AgentRecord - Storage schema for Agent persistence
 *
 * Pure data type representing an agent in storage.
 * Contains serialized definition and config for resume capability.
 */

import type { AgentLifecycle } from "~/agent/AgentLifecycle";

/**
 * Agent storage record
 *
 * Stores the complete agent state including serialized definition
 * to enable full agent reconstruction on resume.
 */
export interface AgentRecord {
  /**
   * Unique agent identifier
   */
  agentId: string;

  /**
   * Serialized agent definition (JSON)
   * Contains name, systemPrompt, tools, etc.
   */
  definition: Record<string, unknown>;

  /**
   * Serialized agent config (JSON)
   * Contains runtime overrides like model, temperature, etc.
   */
  config: Record<string, unknown>;

  /**
   * Current lifecycle status
   */
  lifecycle: AgentLifecycle;

  /**
   * Creation timestamp (Unix milliseconds)
   */
  createdAt: number;

  /**
   * Last update timestamp (Unix milliseconds)
   */
  updatedAt: number;
}
