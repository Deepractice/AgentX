/**
 * MemoryAgentRegistry - In-memory Agent instance registry
 *
 * Simple Map-based registry for managing Agent instances at runtime.
 * Used internally by ContainerImpl - not a Container implementation.
 *
 * @internal
 */

import type { Agent } from "@agentxjs/types";

/**
 * In-memory Agent registry
 *
 * @internal
 */
export class MemoryAgentRegistry {
  private readonly agents: Map<string, Agent> = new Map();

  register(agent: Agent): void {
    this.agents.set(agent.agentId, agent);
  }

  get(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  unregister(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  list(): Agent[] {
    return Array.from(this.agents.values());
  }

  listIds(): string[] {
    return Array.from(this.agents.keys());
  }

  count(): number {
    return this.agents.size;
  }

  clear(): void {
    this.agents.clear();
  }
}

/**
 * @deprecated Use MemoryAgentRegistry instead
 */
export const MemoryContainer = MemoryAgentRegistry;
