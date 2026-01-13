/**
 * MockEnvironment - Mock implementation of Environment
 *
 * Fast, predictable environment for BDD tests.
 * Emits predefined events instead of calling Claude API.
 */

import type { Environment } from "@agentxjs/types/runtime/internal/environment";
import { MockReceptor } from "./MockReceptor";
import { MockEffector } from "./MockEffector";
import { SCENARIOS, type MockScenario } from "./scenarios";

export class MockEnvironment implements Environment {
  readonly name = "mock";
  readonly receptor: MockReceptor;
  readonly effector: MockEffector;

  constructor(config: {
    agentId: string;
    scenario?: string;
    scenarios?: Map<string, MockScenario>;
  }) {
    this.receptor = new MockReceptor();
    this.effector = new MockEffector({
      agentId: config.agentId,
      receptor: this.receptor,
      scenario: config.scenario || "default",
      scenarios: config.scenarios || SCENARIOS,
    });
  }

  /**
   * Change the current scenario (for testing different behaviors)
   */
  setScenario(name: string): void {
    this.effector.setScenario(name);
  }

  dispose(): void {
    this.effector.dispose();
  }
}
