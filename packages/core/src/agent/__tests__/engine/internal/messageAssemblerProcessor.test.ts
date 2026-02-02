/**
 * messageAssemblerProcessor.test.ts - Unit tests for message assembly processor
 *
 * Tests the pure Mealy transition function that assembles complete Message Layer events
 * from Stream Layer events.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  messageAssemblerProcessor,
  createInitialMessageAssemblerState,
  type MessageAssemblerState,
  type MessageAssemblerInput,
  type MessageAssemblerOutput,
} from "../../../engine/internal/messageAssemblerProcessor";

// Helper to create test events
function createStreamEvent(type: string, data: unknown, timestamp = Date.now()): MessageAssemblerInput {
  return { type, data, timestamp } as MessageAssemblerInput;
}

describe("messageAssemblerProcessor", () => {
  let state: MessageAssemblerState;

  beforeEach(() => {
    state = createInitialMessageAssemblerState();
  });

  describe("initial state", () => {
    it("should create correct initial state", () => {
      const initialState = createInitialMessageAssemblerState();

      expect(initialState.currentMessageId).toBeNull();
      expect(initialState.messageStartTime).toBeNull();
      expect(initialState.pendingContents).toEqual({});
      expect(initialState.pendingToolCalls).toEqual({});
    });
  });

  describe("message_start event", () => {
    it("should set currentMessageId and messageStartTime", () => {
      const event = createStreamEvent("message_start", { messageId: "msg_123" }, 1000);

      const [newState, outputs] = messageAssemblerProcessor(state, event);

      expect(newState.currentMessageId).toBe("msg_123");
      expect(newState.messageStartTime).toBe(1000);
      expect(newState.pendingContents).toEqual({});
      expect(outputs).toHaveLength(0);
    });

    it("should reset pendingContents on new message", () => {
      // First message with some content
      state.pendingContents = { 0: { type: "text", index: 0, textDeltas: ["old"] } };

      const event = createStreamEvent("message_start", { messageId: "msg_new" });

      const [newState, outputs] = messageAssemblerProcessor(state, event);

      expect(newState.pendingContents).toEqual({});
      expect(outputs).toHaveLength(0);
    });
  });

  describe("text_delta event", () => {
    it("should accumulate text deltas", () => {
      const event = createStreamEvent("text_delta", { text: "Hello" });

      const [newState, outputs] = messageAssemblerProcessor(state, event);

      expect(newState.pendingContents[0]).toBeDefined();
      expect(newState.pendingContents[0].type).toBe("text");
      expect(newState.pendingContents[0].textDeltas).toContain("Hello");
      expect(outputs).toHaveLength(0);
    });

    it("should append multiple text deltas", () => {
      let currentState = state;

      // First delta
      const [state1] = messageAssemblerProcessor(
        currentState,
        createStreamEvent("text_delta", { text: "Hello" })
      );
      currentState = state1;

      // Second delta
      const [state2] = messageAssemblerProcessor(
        currentState,
        createStreamEvent("text_delta", { text: " World" })
      );
      currentState = state2;

      // Third delta
      const [finalState, outputs] = messageAssemblerProcessor(
        currentState,
        createStreamEvent("text_delta", { text: "!" })
      );

      expect(finalState.pendingContents[0].textDeltas).toEqual(["Hello", " World", "!"]);
      expect(outputs).toHaveLength(0);
    });
  });

  describe("tool_use_start event", () => {
    it("should create pending tool use content", () => {
      const event = createStreamEvent("tool_use_start", {
        toolCallId: "tool_123",
        toolName: "calculate",
      });

      const [newState, outputs] = messageAssemblerProcessor(state, event);

      expect(newState.pendingContents[1]).toBeDefined();
      expect(newState.pendingContents[1].type).toBe("tool_use");
      expect(newState.pendingContents[1].toolId).toBe("tool_123");
      expect(newState.pendingContents[1].toolName).toBe("calculate");
      expect(newState.pendingContents[1].toolInputJson).toBe("");
      expect(outputs).toHaveLength(0);
    });
  });

  describe("input_json_delta event", () => {
    it("should accumulate JSON input for tool use", () => {
      // Setup: start a tool use
      state.pendingContents[1] = {
        type: "tool_use",
        index: 1,
        toolId: "tool_123",
        toolName: "calculate",
        toolInputJson: "",
      };

      const event = createStreamEvent("input_json_delta", { partialJson: '{"value":' });

      const [newState, outputs] = messageAssemblerProcessor(state, event);

      expect(newState.pendingContents[1].toolInputJson).toBe('{"value":');
      expect(outputs).toHaveLength(0);
    });

    it("should append multiple JSON deltas", () => {
      // Setup
      state.pendingContents[1] = {
        type: "tool_use",
        index: 1,
        toolId: "tool_123",
        toolName: "calculate",
        toolInputJson: "",
      };

      let currentState = state;

      // First delta
      const [state1] = messageAssemblerProcessor(
        currentState,
        createStreamEvent("input_json_delta", { partialJson: '{"value":' })
      );
      currentState = state1;

      // Second delta
      const [finalState] = messageAssemblerProcessor(
        currentState,
        createStreamEvent("input_json_delta", { partialJson: "42}" })
      );

      expect(finalState.pendingContents[1].toolInputJson).toBe('{"value":42}');
    });

    it("should ignore input_json_delta without pending tool use", () => {
      const event = createStreamEvent("input_json_delta", { partialJson: "ignored" });

      const [newState, outputs] = messageAssemblerProcessor(state, event);

      expect(newState).toEqual(state);
      expect(outputs).toHaveLength(0);
    });
  });

  describe("tool_use_stop event", () => {
    it("should emit tool_call_message event", () => {
      // Setup: complete tool use sequence
      state.currentMessageId = "parent_msg";
      state.pendingContents[1] = {
        type: "tool_use",
        index: 1,
        toolId: "tool_123",
        toolName: "calculate",
        toolInputJson: '{"x":10,"y":20}',
      };

      const event = createStreamEvent("tool_use_stop", {});

      const [newState, outputs] = messageAssemblerProcessor(state, event);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe("tool_call_message");

      const toolCallMessage = outputs[0].data;
      expect(toolCallMessage.role).toBe("assistant");
      expect(toolCallMessage.subtype).toBe("tool-call");
      expect(toolCallMessage.toolCall.id).toBe("tool_123");
      expect(toolCallMessage.toolCall.name).toBe("calculate");
      expect(toolCallMessage.toolCall.input).toEqual({ x: 10, y: 20 });
      expect(toolCallMessage.parentId).toBe("parent_msg");

      // Should add to pending tool calls
      expect(newState.pendingToolCalls["tool_123"]).toEqual({
        id: "tool_123",
        name: "calculate",
      });

      // Should remove from pending contents
      expect(newState.pendingContents[1]).toBeUndefined();
    });

    it("should handle invalid JSON input gracefully", () => {
      state.pendingContents[1] = {
        type: "tool_use",
        index: 1,
        toolId: "tool_123",
        toolName: "test",
        toolInputJson: "invalid json",
      };

      const event = createStreamEvent("tool_use_stop", {});

      const [newState, outputs] = messageAssemblerProcessor(state, event);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].data.toolCall.input).toEqual({});
    });

    it("should handle missing pending tool use", () => {
      const event = createStreamEvent("tool_use_stop", {});

      const [newState, outputs] = messageAssemblerProcessor(state, event);

      expect(newState).toEqual(state);
      expect(outputs).toHaveLength(0);
    });
  });

  describe("tool_result event", () => {
    it("should emit tool_result_message event", () => {
      // Setup: pending tool call
      state.pendingToolCalls["tool_123"] = {
        id: "tool_123",
        name: "calculate",
      };

      const event = createStreamEvent("tool_result", {
        toolCallId: "tool_123",
        result: "42",
        isError: false,
      });

      const [newState, outputs] = messageAssemblerProcessor(state, event);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe("tool_result_message");

      const toolResultMessage = outputs[0].data;
      expect(toolResultMessage.role).toBe("tool");
      expect(toolResultMessage.subtype).toBe("tool-result");
      expect(toolResultMessage.toolCallId).toBe("tool_123");
      expect(toolResultMessage.toolResult.id).toBe("tool_123");
      expect(toolResultMessage.toolResult.name).toBe("calculate");
      expect(toolResultMessage.toolResult.output.type).toBe("text");
      expect(toolResultMessage.toolResult.output.value).toBe("42");

      // Should remove from pending tool calls
      expect(newState.pendingToolCalls["tool_123"]).toBeUndefined();
    });

    it("should handle error results", () => {
      state.pendingToolCalls["tool_123"] = {
        id: "tool_123",
        name: "test",
      };

      const event = createStreamEvent("tool_result", {
        toolCallId: "tool_123",
        result: "Error: Something went wrong",
        isError: true,
      });

      const [, outputs] = messageAssemblerProcessor(state, event);

      expect(outputs[0].data.toolResult.output.type).toBe("error-text");
    });

    it("should handle unknown tool name", () => {
      const event = createStreamEvent("tool_result", {
        toolCallId: "unknown_tool",
        result: "result",
        isError: false,
      });

      const [, outputs] = messageAssemblerProcessor(state, event);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].data.toolResult.name).toBe("unknown");
    });
  });

  describe("message_stop event", () => {
    it("should emit assistant_message event with assembled content", () => {
      // Setup: complete message with text
      state.currentMessageId = "msg_123";
      state.messageStartTime = 1000;
      state.pendingContents[0] = {
        type: "text",
        index: 0,
        textDeltas: ["Hello", " ", "World!"],
      };

      const event = createStreamEvent("message_stop", { stopReason: "end_turn" });

      const [newState, outputs] = messageAssemblerProcessor(state, event);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe("assistant_message");

      const assistantMessage = outputs[0].data;
      expect(assistantMessage.id).toBe("msg_123");
      expect(assistantMessage.role).toBe("assistant");
      expect(assistantMessage.subtype).toBe("assistant");
      expect(assistantMessage.content).toHaveLength(1);
      expect(assistantMessage.content[0].type).toBe("text");
      expect(assistantMessage.content[0].text).toBe("Hello World!");

      // Should reset state
      expect(newState.currentMessageId).toBeNull();
      expect(newState.pendingContents).toEqual({});
    });

    it("should skip empty messages", () => {
      state.currentMessageId = "msg_123";

      const event = createStreamEvent("message_stop", { stopReason: "end_turn" });

      const [newState, outputs] = messageAssemblerProcessor(state, event);

      expect(outputs).toHaveLength(0);
      expect(newState.currentMessageId).toBeNull();
    });

    it("should skip whitespace-only messages", () => {
      state.currentMessageId = "msg_123";
      state.pendingContents[0] = {
        type: "text",
        index: 0,
        textDeltas: ["   ", "\n", "\t"],
      };

      const event = createStreamEvent("message_stop", { stopReason: "end_turn" });

      const [, outputs] = messageAssemblerProcessor(state, event);

      expect(outputs).toHaveLength(0);
    });

    it("should preserve pending tool calls when stopReason is tool_use", () => {
      state.currentMessageId = "msg_123";
      state.pendingToolCalls["tool_123"] = { id: "tool_123", name: "test" };
      state.pendingContents[0] = {
        type: "text",
        index: 0,
        textDeltas: ["Calling tool..."],
      };

      const event = createStreamEvent("message_stop", { stopReason: "tool_use" });

      const [newState, outputs] = messageAssemblerProcessor(state, event);

      expect(outputs).toHaveLength(1); // Still emits assistant message
      expect(newState.pendingToolCalls["tool_123"]).toBeDefined();
    });

    it("should clear pending tool calls for non-tool_use stop reason", () => {
      state.currentMessageId = "msg_123";
      state.pendingToolCalls["tool_123"] = { id: "tool_123", name: "test" };
      state.pendingContents[0] = {
        type: "text",
        index: 0,
        textDeltas: ["Done"],
      };

      const event = createStreamEvent("message_stop", { stopReason: "end_turn" });

      const [newState] = messageAssemblerProcessor(state, event);

      expect(newState.pendingToolCalls).toEqual({});
    });

    it("should handle missing currentMessageId", () => {
      state.pendingContents[0] = {
        type: "text",
        index: 0,
        textDeltas: ["Some text"],
      };

      const event = createStreamEvent("message_stop", { stopReason: "end_turn" });

      const [, outputs] = messageAssemblerProcessor(state, event);

      expect(outputs).toHaveLength(0);
    });
  });

  describe("error_received event", () => {
    it("should emit error_message event", () => {
      const event = createStreamEvent("error_received", {
        message: "API error occurred",
        errorCode: "api_error",
      });

      const [newState, outputs] = messageAssemblerProcessor(state, event);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe("error_message");

      const errorMessage = outputs[0].data;
      expect(errorMessage.role).toBe("error");
      expect(errorMessage.subtype).toBe("error");
      expect(errorMessage.content).toBe("API error occurred");
      expect(errorMessage.errorCode).toBe("api_error");

      // Should reset state
      expect(newState.currentMessageId).toBeNull();
      expect(newState.pendingContents).toEqual({});
    });

    it("should handle missing errorCode", () => {
      const event = createStreamEvent("error_received", {
        message: "Unknown error",
      });

      const [, outputs] = messageAssemblerProcessor(state, event);

      expect(outputs[0].data.errorCode).toBeUndefined();
    });
  });

  describe("unhandled events", () => {
    it("should pass through unhandled events without state change", () => {
      const event = createStreamEvent("unknown_event_type", { data: "ignored" });

      const [newState, outputs] = messageAssemblerProcessor(state, event);

      expect(newState).toEqual(state);
      expect(outputs).toHaveLength(0);
    });
  });

  describe("complete message flow", () => {
    it("should handle complete text message flow", () => {
      let currentState = createInitialMessageAssemblerState();
      const allOutputs: MessageAssemblerOutput[] = [];

      // message_start
      const [s1, o1] = messageAssemblerProcessor(
        currentState,
        createStreamEvent("message_start", { messageId: "msg_1" }, 1000)
      );
      currentState = s1;
      allOutputs.push(...o1);

      // text_delta
      const [s2, o2] = messageAssemblerProcessor(
        currentState,
        createStreamEvent("text_delta", { text: "Hello" })
      );
      currentState = s2;
      allOutputs.push(...o2);

      // text_delta
      const [s3, o3] = messageAssemblerProcessor(
        currentState,
        createStreamEvent("text_delta", { text: " World" })
      );
      currentState = s3;
      allOutputs.push(...o3);

      // message_stop
      const [s4, o4] = messageAssemblerProcessor(
        currentState,
        createStreamEvent("message_stop", { stopReason: "end_turn" })
      );
      currentState = s4;
      allOutputs.push(...o4);

      expect(allOutputs).toHaveLength(1);
      expect(allOutputs[0].type).toBe("assistant_message");
      expect(allOutputs[0].data.content[0].text).toBe("Hello World");
      expect(currentState).toEqual(createInitialMessageAssemblerState());
    });

    it("should handle tool call flow", () => {
      let currentState = createInitialMessageAssemblerState();
      const allOutputs: MessageAssemblerOutput[] = [];

      // message_start
      const [s1, o1] = messageAssemblerProcessor(
        currentState,
        createStreamEvent("message_start", { messageId: "msg_1" }, 1000)
      );
      currentState = s1;
      allOutputs.push(...o1);

      // tool_use_start
      const [s2, o2] = messageAssemblerProcessor(
        currentState,
        createStreamEvent("tool_use_start", { toolCallId: "tool_1", toolName: "search" })
      );
      currentState = s2;
      allOutputs.push(...o2);

      // input_json_delta
      const [s3, o3] = messageAssemblerProcessor(
        currentState,
        createStreamEvent("input_json_delta", { partialJson: '{"query":"test"}' })
      );
      currentState = s3;
      allOutputs.push(...o3);

      // tool_use_stop
      const [s4, o4] = messageAssemblerProcessor(
        currentState,
        createStreamEvent("tool_use_stop", {})
      );
      currentState = s4;
      allOutputs.push(...o4);

      // message_stop with tool_use
      const [s5, o5] = messageAssemblerProcessor(
        currentState,
        createStreamEvent("message_stop", { stopReason: "tool_use" })
      );
      currentState = s5;
      allOutputs.push(...o5);

      // tool_result
      const [s6, o6] = messageAssemblerProcessor(
        currentState,
        createStreamEvent("tool_result", { toolCallId: "tool_1", result: "Found it!", isError: false })
      );
      currentState = s6;
      allOutputs.push(...o6);

      expect(allOutputs).toHaveLength(2);
      expect(allOutputs[0].type).toBe("tool_call_message");
      expect(allOutputs[0].data.toolCall.name).toBe("search");
      expect(allOutputs[1].type).toBe("tool_result_message");
      expect(allOutputs[1].data.toolResult.output.value).toBe("Found it!");
    });
  });
});
