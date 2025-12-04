/**
 * AgentEngine - Pure Mealy Machine Event Processor
 *
 * AgentEngine is a stateless event processor that transforms DriveableEvents
 * into higher-level events (state, message, turn events).
 *
 * Key Design:
 * - Engine is a pure Mealy Machine: process(agentId, event) → outputs
 * - Engine does NOT hold driver or presenters (those belong to Agent layer)
 * - Engine manages intermediate processing state per agentId
 * - Multiple agents can share the same Engine instance
 *
 * Type Relationship:
 * ```
 * EnvironmentEvent (all external perceptions)
 * │
 * ├── DriveableEvent (can drive Agent) ← Engine processes this
 * │   └── MessageStartEvent, TextDeltaEvent, ToolCallEvent...
 * │
 * └── ConnectionEvent (network status only, NOT processed by Engine)
 * ```
 *
 * State Management:
 * - Processing state (pendingContents, etc.) is managed internally per agentId
 * - Business data persistence is NOT handled here - that's Agent layer's job
 *
 * Usage:
 * ```typescript
 * const engine = new AgentEngine();
 *
 * // Agent layer coordinates:
 * // 1. Driver produces DriveableEvents
 * // 2. Engine processes events
 * // 3. Presenters handle outputs
 *
 * for await (const driveableEvent of driver.receive(message)) {
 *   const outputs = engine.process(agentId, driveableEvent);
 *   for (const output of outputs) {
 *     presenters.forEach(p => p.present(agentId, output));
 *   }
 * }
 * ```
 */

import {
  agentProcessor,
  createInitialAgentEngineState,
  type AgentEngineState,
} from "./AgentProcessor";
import { MemoryStore } from "~/mealy";
import type { AgentOutput, DriveableEvent } from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("engine/AgentEngine");

/**
 * AgentEngine - Pure Mealy Machine for event processing
 *
 * - Input: DriveableEvent (from Driver, subset of EnvironmentEvent)
 * - Output: AgentOutput[] (state, message, turn events)
 * - State: Managed internally per agentId
 */
export class AgentEngine {
  private readonly store: MemoryStore<AgentEngineState>;

  constructor() {
    this.store = new MemoryStore<AgentEngineState>();
    logger.debug("AgentEngine initialized");
  }

  /**
   * Process a single driveable event and return output events
   *
   * This is the core Mealy Machine operation:
   * process(agentId, event) → outputs[]
   *
   * @param agentId - The agent identifier (for state isolation)
   * @param event - DriveableEvent to process (subset of EnvironmentEvent that can drive Agent)
   * @returns Array of output events (state, message, turn events)
   */
  process(agentId: string, event: DriveableEvent): AgentOutput[] {
    const eventType = (event as any).type || "unknown";
    logger.debug("Processing event", { agentId, eventType });

    // Get current state or create initial state
    const isNewState = !this.store.has(agentId);
    let state = this.store.get(agentId) ?? createInitialAgentEngineState();

    if (isNewState) {
      logger.debug("Created initial state for agent", { agentId });
    }

    // Collect all outputs
    const allOutputs: AgentOutput[] = [];

    // Pass-through: original stream event is also an output
    allOutputs.push(event);

    // Process through Mealy Machine
    const [newState, outputs] = agentProcessor(state, event);
    state = newState;

    // Collect processor outputs
    for (const output of outputs) {
      allOutputs.push(output);

      // Re-inject for event chaining (e.g., TurnTracker needs MessageEvents)
      const [chainedState, chainedOutputs] = this.processChained(state, output);
      state = chainedState;
      allOutputs.push(...chainedOutputs);
    }

    // Store updated state
    this.store.set(agentId, state);

    if (outputs.length > 0) {
      logger.debug("Produced outputs", {
        agentId,
        inputEvent: eventType,
        outputCount: allOutputs.length,
        processorOutputs: outputs.length,
      });
    }

    return allOutputs;
  }

  /**
   * Process chained events recursively
   *
   * Some processors produce events that trigger other processors:
   * - MessageAssembler produces MessageEvents
   * - TurnTracker consumes MessageEvents to produce TurnEvents
   */
  private processChained(
    state: AgentEngineState,
    event: AgentOutput
  ): [AgentEngineState, AgentOutput[]] {
    const [newState, outputs] = agentProcessor(state, event);

    if (outputs.length === 0) {
      return [newState, []];
    }

    // Process outputs recursively
    const allOutputs: AgentOutput[] = [...outputs];
    let currentState = newState;

    for (const output of outputs) {
      const [chainedState, chainedOutputs] = this.processChained(currentState, output);
      currentState = chainedState;
      allOutputs.push(...chainedOutputs);
    }

    return [currentState, allOutputs];
  }

  /**
   * Clear state for an agent
   *
   * Call this when an agent is destroyed to free memory.
   */
  clearState(agentId: string): void {
    logger.debug("Clearing state", { agentId });
    this.store.delete(agentId);
  }

  /**
   * Check if state exists for an agent
   */
  hasState(agentId: string): boolean {
    return this.store.has(agentId);
  }
}

/**
 * Factory function to create AgentEngine
 */
export function createAgentEngine(): AgentEngine {
  return new AgentEngine();
}
