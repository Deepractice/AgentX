/**
 * MockEnvironmentFactory - Factory for creating MockEnvironment instances
 *
 * Usage in BDD tests:
 * ```typescript
 * const mockFactory = new MockEnvironmentFactory();
 * mockFactory.setScenario("long-stream");
 *
 * const agentx = await createAgentX({
 *   environmentFactory: mockFactory,
 * });
 * ```
 */

import type { EnvironmentFactory, EnvironmentCreateConfig } from "@agentxjs/types/runtime/internal";
import type { Environment } from "@agentxjs/types/runtime/internal/environment";
import { MockEnvironment } from "./MockEnvironment";
import { SCENARIOS, type MockScenario } from "./scenarios";

export class MockEnvironmentFactory implements EnvironmentFactory {
  private currentScenario = "default";
  private scenarios = SCENARIOS;

  create(config: EnvironmentCreateConfig): Environment {
    return new MockEnvironment({
      agentId: config.agentId,
      scenario: this.currentScenario,
      scenarios: this.scenarios,
    });
  }

  /**
   * Set the scenario for next agent creation
   */
  setScenario(name: string): void {
    this.currentScenario = name;
  }

  /**
   * Define a custom scenario
   */
  defineScenario(name: string, scenario: MockScenario): void {
    this.scenarios.set(name, scenario);
  }

  /**
   * Get available scenario names
   */
  getScenarioNames(): string[] {
    return Array.from(this.scenarios.keys());
  }
}
