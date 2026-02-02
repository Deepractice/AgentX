/**
 * AgentStateMachine - State management interface
 *
 * Manages agent state transitions driven by StateEvents.
 * Single source of truth for agent state.
 *
 * Flow:
 * StreamEvent → MealyMachine → StateEvent → AgentStateMachine → state update
 *
 * Responsibilities:
 * - Process StateEvents
 * - Maintain current AgentState
 * - Notify state change subscribers
 */

import type { AgentState } from "../AgentState";
import type { StateChangeHandler } from "../Agent";
import type { Unsubscribe } from "./AgentOutputCallback";
import type { AgentOutput } from "../AgentOutput";

/**
 * AgentStateMachine interface
 *
 * Processes StateEvents to update internal agent state and notify subscribers.
 */
export interface AgentStateMachine {
  /**
   * Current agent state
   */
  readonly state: AgentState;

  /**
   * Process a StateEvent and update internal state
   *
   * @param event - StateEvent from MealyMachine
   */
  process(event: AgentOutput): void;

  /**
   * Subscribe to state changes
   *
   * @param handler - Callback receiving { prev, current } state change
   * @returns Unsubscribe function
   */
  onStateChange(handler: StateChangeHandler): Unsubscribe;

  /**
   * Reset state machine (used on destroy)
   */
  reset(): void;
}
