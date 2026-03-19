/**
 * MealyMachine - Pure Mealy Machine Event Processor
 *
 * MealyMachine is a stateless event processor that transforms StreamEvents
 * into higher-level events (state, message, turn events).
 *
 * Key Design:
 * - Engine is a pure Mealy Machine: process(instanceId, event) → outputs
 * - Engine does NOT hold driver or presenters (those belong to AgentEngine layer)
 * - Engine manages intermediate processing state per instanceId
 * - Multiple agents can share the same MealyMachine instance
 *
 * Type Relationship:
 * ```
 * StreamEvent (from Driver)
 * │
 * └── message_start, text_delta, tool_use_start, message_stop...
 *         ↓ MealyMachine processes
 * AgentOutput (to AgentEngine/Presenter)
 * │
 * ├── StateEvent (conversation_start, conversation_end...)
 * ├── MessageEvent (assistant_message, tool_result_message...)
 * └── TurnEvent (turn_request, turn_response)
 * ```
 *
 * State Management:
 * - Processing state (pendingContents, etc.) is managed internally per instanceId
 * - Business data persistence is NOT handled here - that's AgentEngine layer's job
 *
 * Usage:
 * ```typescript
 * const machine = new MealyMachine();
 *
 * // AgentEngine layer coordinates:
 * // 1. Driver produces StreamEvents
 * // 2. MealyMachine processes events
 * // 3. Presenters handle outputs
 *
 * for await (const streamEvent of driver.receive(message)) {
 *   const outputs = machine.process(instanceId, streamEvent);
 *   for (const output of outputs) {
 *     presenters.forEach(p => p.present(instanceId, output));
 *   }
 * }
 * ```
 */

import { createLogger } from "@deepracticex/logger";
import type { AgentOutput, StreamEvent } from "../types";
import {
  type AgentEngineState,
  agentProcessor,
  createInitialAgentEngineState,
} from "./AgentProcessor";
import { createInitialMessageAssemblerState } from "./internal/messageAssemblerProcessor";
import { MemoryStore } from "./mealy";

const logger = createLogger("engine/MealyMachine");

/**
 * MealyMachine - Pure Mealy Machine for event processing
 *
 * - Input: StreamEvent (from Driver)
 * - Output: AgentOutput[] (state, message, turn events)
 * - State: Managed internally per instanceId
 */
export class MealyMachine {
  private readonly store: MemoryStore<AgentEngineState>;

  constructor() {
    this.store = new MemoryStore<AgentEngineState>();
    logger.debug("MealyMachine initialized");
  }

  /**
   * Process a single driveable event and return output events
   *
   * This is the core Mealy Machine operation:
   * process(instanceId, event) → outputs[]
   *
   * @param instanceId - The agent identifier (for state isolation)
   * @param event - StreamEvent to process
   * @returns Array of output events (state, message, turn events)
   */
  process(instanceId: string, event: StreamEvent): AgentOutput[] {
    const eventType = (event as { type?: string }).type || "unknown";
    logger.debug("Processing event", { instanceId, eventType });

    // Get current state or create initial state
    const isNewState = !this.store.has(instanceId);
    let state = this.store.get(instanceId) ?? createInitialAgentEngineState();

    if (isNewState) {
      logger.debug("Created initial state for agent", { instanceId });
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
    this.store.set(instanceId, state);

    if (outputs.length > 0) {
      logger.debug("Produced outputs", {
        instanceId,
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
   * Flush pending state and produce any remaining outputs.
   *
   * Called at behavior boundaries (interrupt, error, session end) to ensure
   * all accumulated content is assembled into messages for persistence.
   *
   * If there are pending contents (e.g. partial text from an interrupted stream),
   * this produces an assistant_message with what's been accumulated so far.
   * If nothing is pending, returns empty array.
   *
   * Safe to call multiple times — second call returns empty (state already reset).
   */
  flush(instanceId: string): AgentOutput[] {
    const state = this.store.get(instanceId);
    if (!state) return [];

    const assemblerState = (state as AgentEngineState).messageAssembler;
    if (!assemblerState?.currentMessageId || assemblerState.pendingContents.length === 0) {
      return [];
    }

    // Build content parts from pendingContents (same logic as handleMessageStop)
    const contentParts: Array<{
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }> = [];

    for (const pending of assemblerState.pendingContents) {
      if (pending.type === "text" && pending.textDeltas) {
        const text = pending.textDeltas.join("");
        if (text.trim().length > 0) {
          contentParts.push({ type: "text", text });
        }
      } else if (pending.type === "tool_use") {
        // For interrupted tool_use, try to parse whatever JSON we have so far
        let toolInput: Record<string, unknown> = {};
        if (pending.assembled && pending.parsedInput) {
          toolInput = pending.parsedInput;
        } else if (pending.toolInputJson) {
          try {
            toolInput = JSON.parse(pending.toolInputJson);
          } catch {
            toolInput = {};
          }
        }
        contentParts.push({
          type: "tool-call",
          id: pending.toolId || "",
          name: pending.toolName || "",
          input: toolInput,
        });
      }
    }

    if (contentParts.length === 0) return [];

    // Create partial AssistantMessage
    const timestamp = assemblerState.messageStartTime || Date.now();
    const assistantMessage = {
      id: assemblerState.currentMessageId,
      role: "assistant" as const,
      subtype: "assistant" as const,
      content: contentParts,
      timestamp,
    };

    const assistantEvent = {
      type: "assistant_message",
      timestamp,
      data: assistantMessage,
    } as AgentOutput;

    // Reset assembler state (safe for repeated flush — next call sees empty state)
    const newState: AgentEngineState = {
      ...(state as AgentEngineState),
      messageAssembler: createInitialMessageAssemblerState(),
    };
    this.store.set(instanceId, newState);

    logger.info("Flushed pending content", {
      instanceId,
      contentParts: contentParts.length,
    });

    return [assistantEvent];
  }

  /**
   * Clear state for an agent
   *
   * Call this when an agent is destroyed to free memory.
   */
  clearState(instanceId: string): void {
    logger.debug("Clearing state", { instanceId });
    this.store.delete(instanceId);
  }

  /**
   * Check if state exists for an agent
   */
  hasState(instanceId: string): boolean {
    return this.store.has(instanceId);
  }
}

/**
 * Factory function to create MealyMachine
 */
export function createMealyMachine(): MealyMachine {
  return new MealyMachine();
}
