/**
 * AgentStateMachine.test.ts - Unit tests for AgentStateMachine
 *
 * Tests the state machine that manages agent state transitions
 * driven by StateEvents from the MealyMachine.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { AgentStateMachine } from "../AgentStateMachine";
import type { AgentState, StateChange, AgentOutput } from "../types";

// Helper to create test events
function createStateEvent(type: string, data: unknown = {}): AgentOutput {
  return { type, data, timestamp: Date.now() } as AgentOutput;
}

describe("AgentStateMachine", () => {
  let stateMachine: AgentStateMachine;

  beforeEach(() => {
    stateMachine = new AgentStateMachine();
  });

  describe("initial state", () => {
    it("should start in idle state", () => {
      expect(stateMachine.state).toBe("idle");
    });
  });

  describe("state transitions", () => {
    describe("conversation lifecycle", () => {
      it("should transition to thinking on conversation_start", () => {
        stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));

        expect(stateMachine.state).toBe("thinking");
      });

      it("should transition to thinking on conversation_thinking", () => {
        stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));
        stateMachine.process(createStateEvent("conversation_thinking"));

        expect(stateMachine.state).toBe("thinking");
      });

      it("should transition to responding on conversation_responding", () => {
        stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));
        stateMachine.process(createStateEvent("conversation_responding"));

        expect(stateMachine.state).toBe("responding");
      });

      it("should transition to idle on conversation_end", () => {
        stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));
        stateMachine.process(createStateEvent("conversation_responding"));
        stateMachine.process(createStateEvent("conversation_end", { reason: "completed" }));

        expect(stateMachine.state).toBe("idle");
      });

      it("should transition to idle on conversation_interrupted", () => {
        stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));
        stateMachine.process(createStateEvent("conversation_responding"));
        stateMachine.process(createStateEvent("conversation_interrupted"));

        expect(stateMachine.state).toBe("idle");
      });
    });

    describe("tool lifecycle", () => {
      it("should transition to planning_tool on tool_planned", () => {
        stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));
        stateMachine.process(
          createStateEvent("tool_planned", { toolId: "t1", toolName: "search" })
        );

        expect(stateMachine.state).toBe("planning_tool");
      });

      it("should transition to awaiting_tool_result on tool_executing", () => {
        stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));
        stateMachine.process(
          createStateEvent("tool_planned", { toolId: "t1", toolName: "search" })
        );
        stateMachine.process(
          createStateEvent("tool_executing", { toolId: "t1", toolName: "search", input: {} })
        );

        expect(stateMachine.state).toBe("awaiting_tool_result");
      });

      it("should transition to responding on tool_completed", () => {
        stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));
        stateMachine.process(
          createStateEvent("tool_executing", { toolId: "t1", toolName: "search", input: {} })
        );
        stateMachine.process(createStateEvent("tool_completed", { toolId: "t1", result: "done" }));

        expect(stateMachine.state).toBe("responding");
      });

      it("should transition to responding on tool_failed", () => {
        stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));
        stateMachine.process(
          createStateEvent("tool_executing", { toolId: "t1", toolName: "search", input: {} })
        );
        stateMachine.process(createStateEvent("tool_failed", { toolId: "t1", error: "error" }));

        expect(stateMachine.state).toBe("responding");
      });
    });

    describe("error handling", () => {
      it("should transition to error on error_occurred", () => {
        stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));
        stateMachine.process(
          createStateEvent("error_occurred", {
            code: "api_error",
            message: "API failed",
            recoverable: true,
          })
        );

        expect(stateMachine.state).toBe("error");
      });
    });
  });

  describe("non-state events", () => {
    it("should ignore stream events", () => {
      stateMachine.process(createStateEvent("text_delta", { text: "Hello" }));
      expect(stateMachine.state).toBe("idle");
    });

    it("should ignore message events", () => {
      stateMachine.process(createStateEvent("assistant_message", { content: "Hi" }));
      expect(stateMachine.state).toBe("idle");
    });

    it("should ignore turn events", () => {
      stateMachine.process(createStateEvent("turn_request", { turnId: "t1" }));
      expect(stateMachine.state).toBe("idle");
    });

    it("should ignore unknown events", () => {
      stateMachine.process(createStateEvent("completely_unknown_event", {}));
      expect(stateMachine.state).toBe("idle");
    });
  });

  describe("no redundant transitions", () => {
    it("should not trigger handler when state does not change", () => {
      const changes: StateChange[] = [];
      stateMachine.onStateChange((change) => changes.push(change));

      // Go to thinking
      stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));

      // Process thinking again - no change
      stateMachine.process(createStateEvent("conversation_thinking"));

      // Should only have one change (idle -> thinking)
      expect(changes).toHaveLength(1);
    });
  });

  describe("onStateChange", () => {
    it("should notify handler on state change", () => {
      const changes: StateChange[] = [];
      stateMachine.onStateChange((change) => changes.push(change));

      stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({ prev: "idle", current: "thinking" });
    });

    it("should notify multiple handlers", () => {
      const changes1: StateChange[] = [];
      const changes2: StateChange[] = [];

      stateMachine.onStateChange((change) => changes1.push(change));
      stateMachine.onStateChange((change) => changes2.push(change));

      stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));

      expect(changes1).toHaveLength(1);
      expect(changes2).toHaveLength(1);
    });

    it("should return unsubscribe function", () => {
      const changes: StateChange[] = [];
      const unsubscribe = stateMachine.onStateChange((change) => changes.push(change));

      stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));
      expect(changes).toHaveLength(1);

      unsubscribe();

      stateMachine.process(createStateEvent("conversation_responding"));
      expect(changes).toHaveLength(1); // No new change recorded
    });

    it("should handle handler errors gracefully", () => {
      const goodChanges: StateChange[] = [];

      stateMachine.onStateChange(() => {
        throw new Error("Handler error");
      });
      stateMachine.onStateChange((change) => goodChanges.push(change));

      // Should not throw
      expect(() => {
        stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));
      }).not.toThrow();

      // Good handler should still receive the change
      expect(goodChanges).toHaveLength(1);
    });
  });

  describe("reset", () => {
    it("should reset state to idle", () => {
      stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));
      stateMachine.process(createStateEvent("conversation_responding"));
      expect(stateMachine.state).toBe("responding");

      stateMachine.reset();

      expect(stateMachine.state).toBe("idle");
    });

    it("should notify handlers of reset", () => {
      const changes: StateChange[] = [];
      stateMachine.onStateChange((change) => changes.push(change));

      stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));
      expect(changes).toHaveLength(1);

      stateMachine.reset();

      expect(changes).toHaveLength(2);
      expect(changes[1]).toEqual({ prev: "thinking", current: "idle" });
    });

    it("should not notify if already idle", () => {
      const changes: StateChange[] = [];
      stateMachine.onStateChange((change) => changes.push(change));

      stateMachine.reset();

      expect(changes).toHaveLength(0);
    });

    it("should clear all handlers", () => {
      const changes: StateChange[] = [];
      stateMachine.onStateChange((change) => changes.push(change));

      stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));
      stateMachine.reset();

      // Process new event after reset
      stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_2" }));

      // Handler was cleared, so no new change recorded
      // We had 2 changes: idle->thinking and thinking->idle (from reset)
      expect(changes).toHaveLength(2);
    });
  });

  describe("complete state flow", () => {
    it("should handle complete conversation flow", () => {
      const states: AgentState[] = [stateMachine.state];
      stateMachine.onStateChange((change) => states.push(change.current));

      // User sends message -> conversation starts
      stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));

      // AI starts responding
      stateMachine.process(createStateEvent("conversation_responding"));

      // Conversation ends
      stateMachine.process(createStateEvent("conversation_end", { reason: "completed" }));

      expect(states).toEqual(["idle", "thinking", "responding", "idle"]);
    });

    it("should handle conversation with tool use flow", () => {
      const states: AgentState[] = [stateMachine.state];
      stateMachine.onStateChange((change) => states.push(change.current));

      // Start
      stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));

      // AI plans tool
      stateMachine.process(createStateEvent("tool_planned", { toolId: "t1", toolName: "search" }));

      // Tool executing
      stateMachine.process(
        createStateEvent("tool_executing", { toolId: "t1", toolName: "search", input: {} })
      );

      // Tool completes
      stateMachine.process(createStateEvent("tool_completed", { toolId: "t1", result: "done" }));

      // AI continues responding
      stateMachine.process(createStateEvent("conversation_responding"));

      // End
      stateMachine.process(createStateEvent("conversation_end", { reason: "completed" }));

      // Since we only record state changes (not repeated states),
      // conversation_responding after tool_completed (responding->responding) is not recorded
      expect(states).toEqual([
        "idle",
        "thinking",
        "planning_tool",
        "awaiting_tool_result",
        "responding",
        "idle",
      ]);
    });

    it("should handle error recovery flow", () => {
      const states: AgentState[] = [stateMachine.state];
      stateMachine.onStateChange((change) => states.push(change.current));

      // Start conversation
      stateMachine.process(createStateEvent("conversation_start", { messageId: "msg_1" }));

      // Error occurs
      stateMachine.process(
        createStateEvent("error_occurred", {
          code: "api_error",
          message: "API failed",
          recoverable: true,
        })
      );

      expect(states).toEqual(["idle", "thinking", "error"]);

      // Reset via reset() to simulate recovery
      stateMachine.reset();
      expect(stateMachine.state).toBe("idle");
    });
  });
});
