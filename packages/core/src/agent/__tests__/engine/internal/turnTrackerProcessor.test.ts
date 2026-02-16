/**
 * turnTrackerProcessor.test.ts - Unit tests for turn tracker processor
 *
 * Tests the pure Mealy transition function that tracks request-response turn pairs.
 * Turn events are derived entirely from stream-layer events:
 * - message_start → turn_request
 * - message_stop  → turn_response
 */

import { beforeEach, describe, expect, it } from "bun:test";
import {
  createInitialTurnTrackerState,
  type TurnTrackerInput,
  type TurnTrackerOutput,
  type TurnTrackerState,
  turnTrackerProcessor,
} from "../../../engine/internal/turnTrackerProcessor";

// Helper to create test events
function createEvent(type: string, data: unknown, timestamp = Date.now()): TurnTrackerInput {
  return { type, data, timestamp } as TurnTrackerInput;
}

// Helper to create message_start event (begins a turn)
function createMessageStartEvent(
  messageId: string = `msg_${Date.now()}`,
  timestamp = Date.now()
): TurnTrackerInput {
  return createEvent("message_start", { messageId, model: "test-model" }, timestamp);
}

// Helper to create message_stop event
function createMessageStopEvent(stopReason: string, timestamp = Date.now()): TurnTrackerInput {
  return createEvent("message_stop", { stopReason }, timestamp);
}

describe("turnTrackerProcessor", () => {
  let state: TurnTrackerState;

  beforeEach(() => {
    state = createInitialTurnTrackerState();
  });

  describe("initial state", () => {
    it("should create correct initial state", () => {
      const initialState = createInitialTurnTrackerState();

      expect(initialState.pendingTurn).toBeNull();
      expect(initialState.costPerInputToken).toBe(0.000003);
      expect(initialState.costPerOutputToken).toBe(0.000015);
    });
  });

  describe("message_start event", () => {
    it("should create pending turn and emit turn_request", () => {
      const event = createMessageStartEvent("msg_123", 1000);

      const [newState, outputs] = turnTrackerProcessor(state, event);

      // Should have pending turn
      expect(newState.pendingTurn).not.toBeNull();
      expect(newState.pendingTurn?.messageId).toBe("msg_123");
      expect(newState.pendingTurn?.requestedAt).toBe(1000);
      expect(newState.pendingTurn?.turnId).toBeDefined();

      // Should emit turn_request
      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe("turn_request");
      expect(outputs[0].data.messageId).toBe("msg_123");
      expect(outputs[0].data.timestamp).toBe(1000);
    });

    it("should generate unique turn IDs", () => {
      const [state1, outputs1] = turnTrackerProcessor(state, createMessageStartEvent("msg_1"));

      // Complete the turn
      const [state2] = turnTrackerProcessor(state1, createMessageStopEvent("end_turn"));

      // Start new turn
      const [_state3, outputs3] = turnTrackerProcessor(state2, createMessageStartEvent("msg_2"));

      expect(outputs1[0].data.turnId).not.toBe(outputs3[0].data.turnId);
    });

    it("should NOT start a new turn if one is already pending", () => {
      // Start first turn
      const [state1, outputs1] = turnTrackerProcessor(
        state,
        createMessageStartEvent("msg_1", 1000)
      );
      expect(outputs1).toHaveLength(1);

      // Second message_start while turn is pending (e.g. after tool_use)
      const [state2, outputs2] = turnTrackerProcessor(
        state1,
        createMessageStartEvent("msg_2", 1500)
      );

      // Should NOT emit another turn_request
      expect(outputs2).toHaveLength(0);
      // Pending turn should still be the original
      expect(state2.pendingTurn?.messageId).toBe("msg_1");
    });
  });

  describe("message_stop event", () => {
    describe("with pending turn", () => {
      beforeEach(() => {
        // Setup pending turn
        state = {
          ...state,
          pendingTurn: {
            turnId: "turn_123",
            messageId: "msg_123",
            content: "",
            requestedAt: 1000,
          },
        };
      });

      it("should complete turn and emit turn_response for end_turn", () => {
        const event = createMessageStopEvent("end_turn", 2000);

        const [newState, outputs] = turnTrackerProcessor(state, event);

        expect(newState.pendingTurn).toBeNull();

        expect(outputs).toHaveLength(1);
        expect(outputs[0].type).toBe("turn_response");
        expect(outputs[0].data.turnId).toBe("turn_123");
        expect(outputs[0].data.messageId).toBe("msg_123");
        expect(outputs[0].data.duration).toBe(1000); // 2000 - 1000
        expect(outputs[0].data.timestamp).toBe(2000);
      });

      it("should complete turn for max_tokens", () => {
        const event = createMessageStopEvent("max_tokens", 3000);

        const [newState, outputs] = turnTrackerProcessor(state, event);

        expect(newState.pendingTurn).toBeNull();
        expect(outputs).toHaveLength(1);
        expect(outputs[0].type).toBe("turn_response");
        expect(outputs[0].data.duration).toBe(2000); // 3000 - 1000
      });

      it("should complete turn for stop_sequence", () => {
        const event = createMessageStopEvent("stop_sequence", 1500);

        const [newState, outputs] = turnTrackerProcessor(state, event);

        expect(newState.pendingTurn).toBeNull();
        expect(outputs).toHaveLength(1);
        expect(outputs[0].type).toBe("turn_response");
        expect(outputs[0].data.duration).toBe(500); // 1500 - 1000
      });

      it("should NOT complete turn for tool_use", () => {
        const event = createMessageStopEvent("tool_use", 2000);

        const [newState, outputs] = turnTrackerProcessor(state, event);

        // Should keep pending turn
        expect(newState.pendingTurn).not.toBeNull();
        expect(newState.pendingTurn?.turnId).toBe("turn_123");

        // Should not emit output
        expect(outputs).toHaveLength(0);
      });

      it("should include usage information", () => {
        const event = createMessageStopEvent("end_turn", 2000);

        const [, outputs] = turnTrackerProcessor(state, event);

        expect(outputs[0].data.usage).toBeDefined();
        expect(outputs[0].data.usage.inputTokens).toBe(0);
        expect(outputs[0].data.usage.outputTokens).toBe(0);
      });
    });

    describe("without pending turn", () => {
      it("should not emit output when no pending turn", () => {
        const event = createMessageStopEvent("end_turn", 2000);

        const [newState, outputs] = turnTrackerProcessor(state, event);

        expect(newState).toEqual(state);
        expect(outputs).toHaveLength(0);
      });
    });
  });

  describe("unhandled events", () => {
    it("should pass through unhandled events", () => {
      const event = createEvent("text_delta", { text: "Hello" });

      const [newState, outputs] = turnTrackerProcessor(state, event);

      expect(newState).toEqual(state);
      expect(outputs).toHaveLength(0);
    });

    it("should ignore assistant_message (not a stream event)", () => {
      state = {
        ...state,
        pendingTurn: {
          turnId: "turn_123",
          messageId: "msg_123",
          content: "",
          requestedAt: 1000,
        },
      };

      const event = createEvent("assistant_message", {
        id: "msg_assistant",
        role: "assistant",
        content: [{ type: "text", text: "Response" }],
      });

      const [newState, outputs] = turnTrackerProcessor(state, event);

      expect(newState.pendingTurn).not.toBeNull();
      expect(outputs).toHaveLength(0);
    });
  });

  describe("complete turn flow", () => {
    it("should track complete turn from message_start to message_stop", () => {
      const allOutputs: TurnTrackerOutput[] = [];
      let currentState = createInitialTurnTrackerState();

      // message_start at time 1000
      const [s1, o1] = turnTrackerProcessor(currentState, createMessageStartEvent("msg_1", 1000));
      currentState = s1;
      allOutputs.push(...o1);

      // message_stop at time 2500
      const [s2, o2] = turnTrackerProcessor(currentState, createMessageStopEvent("end_turn", 2500));
      currentState = s2;
      allOutputs.push(...o2);

      expect(allOutputs).toHaveLength(2);

      // turn_request
      expect(allOutputs[0].type).toBe("turn_request");
      expect(allOutputs[0].data.messageId).toBe("msg_1");

      // turn_response
      expect(allOutputs[1].type).toBe("turn_response");
      expect(allOutputs[1].data.duration).toBe(1500);

      // State should be clean
      expect(currentState.pendingTurn).toBeNull();
    });

    it("should track turn with tool use (turn continues)", () => {
      const allOutputs: TurnTrackerOutput[] = [];
      let currentState = createInitialTurnTrackerState();

      // message_start begins the turn
      const [s1, o1] = turnTrackerProcessor(currentState, createMessageStartEvent("msg_1", 1000));
      currentState = s1;
      allOutputs.push(...o1);

      // First message_stop with tool_use - turn should NOT complete
      const [s2, o2] = turnTrackerProcessor(currentState, createMessageStopEvent("tool_use", 1500));
      currentState = s2;
      allOutputs.push(...o2);

      expect(currentState.pendingTurn).not.toBeNull();
      expect(allOutputs).toHaveLength(1); // Only turn_request

      // Second message_start after tool_use — should NOT start new turn (pending exists)
      const [s2b, o2b] = turnTrackerProcessor(currentState, createMessageStartEvent("msg_2", 2000));
      currentState = s2b;
      allOutputs.push(...o2b);
      expect(allOutputs).toHaveLength(1); // Still only turn_request

      // Final message_stop with end_turn - turn completes
      const [s3, o3] = turnTrackerProcessor(currentState, createMessageStopEvent("end_turn", 3000));
      currentState = s3;
      allOutputs.push(...o3);

      expect(allOutputs).toHaveLength(2); // turn_request + turn_response
      expect(allOutputs[1].type).toBe("turn_response");
      expect(allOutputs[1].data.duration).toBe(2000); // 3000 - 1000
      expect(currentState.pendingTurn).toBeNull();
    });

    it("should handle multiple consecutive turns", () => {
      let currentState = createInitialTurnTrackerState();
      const allTurnIds: string[] = [];

      // First turn
      const [s1, o1] = turnTrackerProcessor(currentState, createMessageStartEvent("msg_1", 1000));
      currentState = s1;
      allTurnIds.push(o1[0].data.turnId);

      const [s2] = turnTrackerProcessor(currentState, createMessageStopEvent("end_turn", 1500));
      currentState = s2;

      // Second turn
      const [s3, o3] = turnTrackerProcessor(currentState, createMessageStartEvent("msg_2", 2000));
      currentState = s3;
      allTurnIds.push(o3[0].data.turnId);

      const [s4] = turnTrackerProcessor(currentState, createMessageStopEvent("end_turn", 2500));
      currentState = s4;

      // Third turn
      const [s5, o5] = turnTrackerProcessor(currentState, createMessageStartEvent("msg_3", 3000));
      currentState = s5;
      allTurnIds.push(o5[0].data.turnId);

      // All turn IDs should be unique
      const uniqueIds = new Set(allTurnIds);
      expect(uniqueIds.size).toBe(3);
    });
  });
});
