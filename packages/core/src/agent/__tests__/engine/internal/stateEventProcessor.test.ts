/**
 * stateEventProcessor.test.ts - Unit tests for state event processor
 *
 * Tests the stateless event transformer: Stream Events -> State Events
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  stateEventProcessor,
  createInitialStateEventProcessorContext,
  type StateEventProcessorContext,
  type StateEventProcessorInput,
  type StateEventProcessorOutput,
} from "../../../engine/internal/stateEventProcessor";

// Helper to create test events
function createStreamEvent(
  type: string,
  data: unknown = {},
  timestamp = Date.now()
): StateEventProcessorInput {
  return { type, data, timestamp } as StateEventProcessorInput;
}

describe("stateEventProcessor", () => {
  let context: StateEventProcessorContext;

  beforeEach(() => {
    context = createInitialStateEventProcessorContext();
  });

  describe("initial context", () => {
    it("should create empty initial context", () => {
      const initialContext = createInitialStateEventProcessorContext();
      expect(initialContext).toEqual({});
    });
  });

  describe("message_start event", () => {
    it("should emit conversation_start event", () => {
      const event = createStreamEvent("message_start", { messageId: "msg_123" });

      const [newContext, outputs] = stateEventProcessor(context, event);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe("conversation_start");
      expect(outputs[0].data.messageId).toBe("msg_123");
      expect(outputs[0].timestamp).toBeDefined();

      // Context should remain unchanged
      expect(newContext).toEqual(context);
    });
  });

  describe("message_delta event", () => {
    it("should not emit any event (no-op)", () => {
      const event = createStreamEvent("message_delta", { stopReason: "end_turn" });

      const [newContext, outputs] = stateEventProcessor(context, event);

      expect(outputs).toHaveLength(0);
      expect(newContext).toEqual(context);
    });
  });

  describe("message_stop event", () => {
    it("should emit conversation_end for end_turn stop reason", () => {
      const event = createStreamEvent("message_stop", { stopReason: "end_turn" });

      const [newContext, outputs] = stateEventProcessor(context, event);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe("conversation_end");
      expect(outputs[0].data.reason).toBe("completed");
    });

    it("should emit conversation_end for max_tokens stop reason", () => {
      const event = createStreamEvent("message_stop", { stopReason: "max_tokens" });

      const [, outputs] = stateEventProcessor(context, event);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe("conversation_end");
    });

    it("should emit conversation_end for stop_sequence stop reason", () => {
      const event = createStreamEvent("message_stop", { stopReason: "stop_sequence" });

      const [, outputs] = stateEventProcessor(context, event);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe("conversation_end");
    });

    it("should NOT emit conversation_end for tool_use stop reason", () => {
      const event = createStreamEvent("message_stop", { stopReason: "tool_use" });

      const [newContext, outputs] = stateEventProcessor(context, event);

      expect(outputs).toHaveLength(0);
      expect(newContext).toEqual(context);
    });
  });

  describe("text_delta event", () => {
    it("should emit conversation_responding event", () => {
      const event = createStreamEvent("text_delta", { text: "Hello" });

      const [newContext, outputs] = stateEventProcessor(context, event);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe("conversation_responding");
      expect(outputs[0].data).toEqual({});
      expect(outputs[0].timestamp).toBeDefined();
    });
  });

  describe("tool_use_start event", () => {
    it("should emit tool_planned and tool_executing events", () => {
      const event = createStreamEvent("tool_use_start", {
        toolCallId: "tool_123",
        toolName: "search",
      });

      const [newContext, outputs] = stateEventProcessor(context, event);

      expect(outputs).toHaveLength(2);

      // First output: tool_planned
      expect(outputs[0].type).toBe("tool_planned");
      expect(outputs[0].data.toolId).toBe("tool_123");
      expect(outputs[0].data.toolName).toBe("search");

      // Second output: tool_executing
      expect(outputs[1].type).toBe("tool_executing");
      expect(outputs[1].data.toolId).toBe("tool_123");
      expect(outputs[1].data.toolName).toBe("search");
      expect(outputs[1].data.input).toEqual({});
    });
  });

  describe("tool_use_stop event", () => {
    it("should not emit any event (pass through)", () => {
      const event = createStreamEvent("tool_use_stop", {});

      const [newContext, outputs] = stateEventProcessor(context, event);

      expect(outputs).toHaveLength(0);
      expect(newContext).toEqual(context);
    });
  });

  describe("error_received event", () => {
    it("should emit error_occurred event with error details", () => {
      const event = createStreamEvent("error_received", {
        message: "API rate limit exceeded",
        errorCode: "rate_limit",
      });

      const [newContext, outputs] = stateEventProcessor(context, event);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe("error_occurred");
      expect(outputs[0].data.code).toBe("rate_limit");
      expect(outputs[0].data.message).toBe("API rate limit exceeded");
      expect(outputs[0].data.recoverable).toBe(true);
    });

    it("should use unknown_error code when errorCode is missing", () => {
      const event = createStreamEvent("error_received", {
        message: "Something went wrong",
      });

      const [, outputs] = stateEventProcessor(context, event);

      expect(outputs[0].data.code).toBe("unknown_error");
    });
  });

  describe("unhandled events", () => {
    it("should pass through unhandled events without output", () => {
      const event = createStreamEvent("input_json_delta", { partialJson: "{}" });

      const [newContext, outputs] = stateEventProcessor(context, event);

      expect(outputs).toHaveLength(0);
      expect(newContext).toEqual(context);
    });

    it("should handle completely unknown event types", () => {
      const event = createStreamEvent("completely_unknown_event", { anything: true });

      const [newContext, outputs] = stateEventProcessor(context, event);

      expect(outputs).toHaveLength(0);
      expect(newContext).toEqual(context);
    });
  });

  describe("complete conversation flow", () => {
    it("should produce correct state events for simple message", () => {
      const allOutputs: StateEventProcessorOutput[] = [];

      // message_start
      const [, o1] = stateEventProcessor(
        context,
        createStreamEvent("message_start", { messageId: "msg_1" })
      );
      allOutputs.push(...o1);

      // text_delta
      const [, o2] = stateEventProcessor(
        context,
        createStreamEvent("text_delta", { text: "Hello" })
      );
      allOutputs.push(...o2);

      // message_stop
      const [, o3] = stateEventProcessor(
        context,
        createStreamEvent("message_stop", { stopReason: "end_turn" })
      );
      allOutputs.push(...o3);

      expect(allOutputs).toHaveLength(3);
      expect(allOutputs.map((o) => o.type)).toEqual([
        "conversation_start",
        "conversation_responding",
        "conversation_end",
      ]);
    });

    it("should produce correct state events for tool call flow", () => {
      const allOutputs: StateEventProcessorOutput[] = [];

      // message_start
      const [, o1] = stateEventProcessor(
        context,
        createStreamEvent("message_start", { messageId: "msg_1" })
      );
      allOutputs.push(...o1);

      // tool_use_start
      const [, o2] = stateEventProcessor(
        context,
        createStreamEvent("tool_use_start", { toolCallId: "tool_1", toolName: "search" })
      );
      allOutputs.push(...o2);

      // tool_use_stop
      const [, o3] = stateEventProcessor(context, createStreamEvent("tool_use_stop", {}));
      allOutputs.push(...o3);

      // message_stop with tool_use (should NOT emit conversation_end)
      const [, o4] = stateEventProcessor(
        context,
        createStreamEvent("message_stop", { stopReason: "tool_use" })
      );
      allOutputs.push(...o4);

      // New message after tool result
      const [, o5] = stateEventProcessor(
        context,
        createStreamEvent("message_start", { messageId: "msg_2" })
      );
      allOutputs.push(...o5);

      // text_delta with final response
      const [, o6] = stateEventProcessor(
        context,
        createStreamEvent("text_delta", { text: "Result" })
      );
      allOutputs.push(...o6);

      // Final message_stop
      const [, o7] = stateEventProcessor(
        context,
        createStreamEvent("message_stop", { stopReason: "end_turn" })
      );
      allOutputs.push(...o7);

      expect(allOutputs.map((o) => o.type)).toEqual([
        "conversation_start", // msg_1 start
        "tool_planned", // tool started
        "tool_executing", // tool executing
        // No output for tool_use_stop
        // No conversation_end for tool_use
        "conversation_start", // msg_2 start
        "conversation_responding", // text delta
        "conversation_end", // final end
      ]);
    });
  });

  describe("statelessness", () => {
    it("should not modify context across multiple calls", () => {
      const originalContext = createInitialStateEventProcessorContext();

      // Process multiple events
      stateEventProcessor(originalContext, createStreamEvent("message_start", { messageId: "1" }));
      stateEventProcessor(originalContext, createStreamEvent("text_delta", { text: "Hello" }));
      stateEventProcessor(
        originalContext,
        createStreamEvent("tool_use_start", { toolCallId: "t1", toolName: "test" })
      );
      stateEventProcessor(
        originalContext,
        createStreamEvent("error_received", { message: "error" })
      );

      // Original context should remain unchanged
      expect(originalContext).toEqual({});
    });
  });
});
