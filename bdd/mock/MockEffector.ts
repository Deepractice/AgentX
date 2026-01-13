/**
 * MockEffector - Mock implementation of Effector
 *
 * Listens to SystemBus for user_message events and emits predefined mock events.
 */

import type { Effector } from "@agentxjs/types/runtime/internal/environment";
import type { SystemBusConsumer, SystemEvent } from "@agentxjs/types/runtime/internal";
import type { MockReceptor } from "./MockReceptor";
import type { MockScenario, MockEvent } from "./scenarios";

export class MockEffector implements Effector {
  private agentId: string;
  private receptor: MockReceptor;
  private currentScenario: string;
  private scenarios: Map<string, MockScenario>;
  private unsubscribe?: () => void;

  constructor(config: {
    agentId: string;
    receptor: MockReceptor;
    scenario: string;
    scenarios: Map<string, MockScenario>;
  }) {
    this.agentId = config.agentId;
    this.receptor = config.receptor;
    this.currentScenario = config.scenario;
    this.scenarios = config.scenarios;
  }

  connect(consumer: SystemBusConsumer): void {
    console.log(`[MockEffector] Connected for agent ${this.agentId}`);

    // Listen for user_message events
    this.unsubscribe = consumer.on("user_message", async (event) => {
      console.log(
        `[MockEffector] Received user_message, agentId: ${event.context?.agentId}, mine: ${this.agentId}`
      );

      // Filter: Only handle messages for this agent
      if (event.context?.agentId !== this.agentId) {
        return;
      }

      console.log(`[MockEffector] Processing message with scenario: ${this.currentScenario}`);
      // Process user message and emit mock response
      await this.handleUserMessage(event);
    });
  }

  private async handleUserMessage(event: SystemEvent): Promise<void> {
    const scenario = this.scenarios.get(this.currentScenario);
    if (!scenario) {
      console.warn(`[MockEffector] Scenario "${this.currentScenario}" not found`);
      return;
    }

    // Emit predefined events from scenario
    for (const mockEvent of scenario.events) {
      // Delay if specified (simulates streaming)
      if (mockEvent.delay) {
        await new Promise((r) => setTimeout(r, mockEvent.delay));
      }

      // Emit to SystemBus via Receptor
      this.receptor.emit({
        type: mockEvent.type,
        timestamp: Date.now(),
        data: mockEvent.data ?? {},
        source: "environment",
        category: this.inferCategory(mockEvent.type),
        intent: "notification",
        context: event.context, // Inherit context (agentId, sessionId, etc.)
        broadcastable: true,
      } as SystemEvent);
    }
  }

  private inferCategory(type: string): string {
    if (
      type.includes("_start") ||
      type.includes("_stop") ||
      type.includes("_delta") ||
      type === "tool_call"
    ) {
      return "stream";
    }
    if (type === "error") {
      return "error";
    }
    return "notification";
  }

  setScenario(name: string): void {
    this.currentScenario = name;
  }

  dispose(): void {
    this.unsubscribe?.();
  }
}
