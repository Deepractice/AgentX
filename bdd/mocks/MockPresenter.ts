/**
 * MockPresenter - Test double for AgentPresenter
 *
 * Records all presented outputs for testing assertions.
 */

import type { AgentPresenter, AgentOutput } from "@agentxjs/types/agent";

export class MockPresenter implements AgentPresenter {
  readonly name: string;
  readonly description = "Mock presenter for testing";

  private _outputs: Array<{ agentId: string; output: AgentOutput }> = [];

  constructor(name = "MockPresenter") {
    this.name = name;
  }

  /**
   * Get all presented outputs
   */
  get outputs(): Array<{ agentId: string; output: AgentOutput }> {
    return [...this._outputs];
  }

  /**
   * Get outputs by type
   */
  getByType<T extends AgentOutput["type"]>(
    type: T
  ): Array<Extract<AgentOutput, { type: T }>> {
    return this._outputs
      .filter((o) => o.output.type === type)
      .map((o) => o.output as Extract<AgentOutput, { type: T }>);
  }

  /**
   * Check if specific event type was received
   */
  hasEventType(type: AgentOutput["type"]): boolean {
    return this._outputs.some((o) => o.output.type === type);
  }

  /**
   * Count events of specific type
   */
  countByType(type: AgentOutput["type"]): number {
    return this._outputs.filter((o) => o.output.type === type).length;
  }

  /**
   * Reset recorded outputs
   */
  reset(): void {
    this._outputs = [];
  }

  present(agentId: string, output: AgentOutput): void {
    this._outputs.push({ agentId, output });
  }
}
