/**
 * Presentation Reducer — Unified Conversations (no separate streaming)
 *
 * Red-Green-Refactor: These tests define the target behavior.
 * streaming content should be in conversations[] as the last item
 * with isStreaming: true.
 */

import { describe, expect, test } from "bun:test";
import type { BusEvent } from "@agentxjs/core/event";
import { createInitialState, presentationReducer } from "../src/presentation/reducer";
import type {
  AssistantConversation,
  PresentationState,
  TextBlock,
  ToolBlock,
} from "../src/presentation/types";

function event(type: string, data: Record<string, unknown> = {}): BusEvent {
  return { type, timestamp: Date.now(), data } as unknown as BusEvent;
}

function lastConv(state: PresentationState): AssistantConversation {
  return state.conversations[state.conversations.length - 1] as AssistantConversation;
}

// ============================================================================
// Scenario 1: Basic text streaming — typewriter effect
// ============================================================================

describe("Text streaming in conversations", () => {
  test("message_start adds assistant conversation with isStreaming: true", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "test" })
    );

    expect(state.conversations).toHaveLength(1);
    expect(state.conversations[0].role).toBe("assistant");
    expect((state.conversations[0] as AssistantConversation).isStreaming).toBe(true);
    expect(state.status).toBe("thinking");
    // streaming field should be null — content is in conversations
    expect(state.streaming).toBeNull();
  });

  test("text_delta updates last conversation's text block", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "test" })
    );
    state = presentationReducer(state, event("text_delta", { text: "Hello " }));
    state = presentationReducer(state, event("text_delta", { text: "world" }));

    const conv = lastConv(state);
    expect(conv.isStreaming).toBe(true);
    expect(conv.blocks).toHaveLength(1);
    expect((conv.blocks[0] as TextBlock).content).toBe("Hello world");
    expect(state.status).toBe("responding");
    expect(state.streaming).toBeNull();
  });

  test("message_stop sets isStreaming to false", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "test" })
    );
    state = presentationReducer(state, event("text_delta", { text: "Done" }));
    state = presentationReducer(state, event("message_stop", { stopReason: "end_turn" }));

    const conv = lastConv(state);
    expect(conv.isStreaming).toBe(false);
    expect((conv.blocks[0] as TextBlock).content).toBe("Done");
    expect(state.status).toBe("idle");
    expect(state.streaming).toBeNull();
  });
});

// ============================================================================
// Scenario 2: Tool call streaming — visible during execution
// ============================================================================

describe("Tool call streaming in conversations", () => {
  test("tool_use_start adds tool block to last conversation", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "test" })
    );
    state = presentationReducer(state, event("text_delta", { text: "Let me search. " }));
    state = presentationReducer(
      state,
      event("tool_use_start", { toolCallId: "tc_1", toolName: "search" })
    );

    const conv = lastConv(state);
    expect(conv.isStreaming).toBe(true);
    expect(conv.blocks).toHaveLength(2);
    expect(conv.blocks[0].type).toBe("text");
    expect(conv.blocks[1].type).toBe("tool");
    expect((conv.blocks[1] as ToolBlock).toolName).toBe("search");
    expect((conv.blocks[1] as ToolBlock).status).toBe("pending");
    expect(state.streaming).toBeNull();
  });

  test("input_json_delta updates tool block partialInput", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "test" })
    );
    state = presentationReducer(
      state,
      event("tool_use_start", { toolCallId: "tc_1", toolName: "search" })
    );
    state = presentationReducer(state, event("input_json_delta", { partialJson: '{"query":' }));
    state = presentationReducer(state, event("input_json_delta", { partialJson: '"hello"}' }));

    const conv = lastConv(state);
    const toolBlock = conv.blocks[0] as ToolBlock;
    expect(toolBlock.status).toBe("pending");
    // partialInput should be visible during streaming
    expect((toolBlock as any).partialInput).toBe('{"query":"hello"}');
  });

  test("tool_use_stop sets tool status to running with parsed input", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "test" })
    );
    state = presentationReducer(
      state,
      event("tool_use_start", { toolCallId: "tc_1", toolName: "bash" })
    );
    state = presentationReducer(
      state,
      event("input_json_delta", { partialJson: '{"command":"ls"}' })
    );
    state = presentationReducer(
      state,
      event("tool_use_stop", {
        toolCallId: "tc_1",
        toolName: "bash",
        input: { command: "ls" },
      })
    );

    const conv = lastConv(state);
    const toolBlock = conv.blocks[0] as ToolBlock;
    expect(toolBlock.status).toBe("running");
    expect(toolBlock.toolInput).toEqual({ command: "ls" });
    expect(state.status).toBe("executing");
  });

  test("tool_result sets tool status to completed", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "test" })
    );
    state = presentationReducer(
      state,
      event("tool_use_start", { toolCallId: "tc_1", toolName: "bash" })
    );
    state = presentationReducer(
      state,
      event("tool_use_stop", { toolCallId: "tc_1", toolName: "bash", input: { command: "ls" } })
    );
    // message_stop with tool_use reason
    state = presentationReducer(state, event("message_stop", { stopReason: "tool_use" }));
    // tool_result arrives
    state = presentationReducer(
      state,
      event("tool_result", { toolCallId: "tc_1", result: "file1.txt\nfile2.txt", isError: false })
    );

    // Tool result should update the tool block in conversations
    const conv = lastConv(state);
    const toolBlock = conv.blocks.find((b) => b.type === "tool") as ToolBlock;
    expect(toolBlock.status).toBe("completed");
    expect(toolBlock.toolResult).toContain("file1.txt");
  });
});

// ============================================================================
// Scenario 3: Interrupt
// ============================================================================

describe("Interrupt during streaming", () => {
  test("interrupted flushes streaming conversation with isStreaming: false", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "test" })
    );
    state = presentationReducer(state, event("text_delta", { text: "partial response" }));
    state = presentationReducer(state, event("interrupted", { reason: "user" }));

    expect(state.conversations).toHaveLength(1);
    const conv = lastConv(state);
    expect(conv.isStreaming).toBe(false);
    expect((conv.blocks[0] as TextBlock).content).toBe("partial response");
    expect(state.status).toBe("idle");
    expect(state.streaming).toBeNull();
  });
});

// ============================================================================
// Scenario 4: Error
// ============================================================================

describe("Error during streaming", () => {
  test("error adds error conversation and clears streaming state", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "test" })
    );
    state = presentationReducer(state, event("text_delta", { text: "before error" }));
    state = presentationReducer(state, event("error", { message: "API failed" }));

    // Should have the partial assistant + error
    const lastC = state.conversations[state.conversations.length - 1];
    expect(lastC.role).toBe("error");
    expect(state.status).toBe("idle");
    expect(state.streaming).toBeNull();
  });
});

// ============================================================================
// Scenario 5: Multi-turn conversation
// ============================================================================

describe("Multi-turn conversations", () => {
  test("second message_start adds new assistant conversation", () => {
    let state = createInitialState();

    // Turn 1
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "test" })
    );
    state = presentationReducer(state, event("text_delta", { text: "First reply" }));
    state = presentationReducer(state, event("message_stop", { stopReason: "end_turn" }));

    expect(state.conversations).toHaveLength(1);
    expect(lastConv(state).isStreaming).toBe(false);

    // Turn 2
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_2", model: "test" })
    );
    state = presentationReducer(state, event("text_delta", { text: "Second reply" }));

    expect(state.conversations).toHaveLength(2);
    expect((state.conversations[0] as AssistantConversation).isStreaming).toBe(false);
    expect((state.conversations[1] as AssistantConversation).isStreaming).toBe(true);
    expect(state.streaming).toBeNull();
  });
});

// ============================================================================
// Scenario 6: Multi-step tool use (tool_use stop → tool_result → new message_start)
// ============================================================================

describe("Multi-step tool use", () => {
  test("tool use cycle keeps conversation in conversations array throughout", () => {
    let state = createInitialState();

    // Step 1: text + tool call
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "test" })
    );
    state = presentationReducer(state, event("text_delta", { text: "Checking... " }));
    state = presentationReducer(
      state,
      event("tool_use_start", { toolCallId: "tc_1", toolName: "bash" })
    );
    state = presentationReducer(
      state,
      event("tool_use_stop", { toolCallId: "tc_1", toolName: "bash", input: { command: "pwd" } })
    );

    // Conversation should be visible the whole time
    expect(state.conversations.length).toBeGreaterThanOrEqual(1);
    expect(state.streaming).toBeNull();

    // message_stop with tool_use
    state = presentationReducer(state, event("message_stop", { stopReason: "tool_use" }));

    // tool_result
    state = presentationReducer(
      state,
      event("tool_result", { toolCallId: "tc_1", result: "/home/user", isError: false })
    );

    // Step 2: new message after tool result
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_2", model: "test" })
    );
    state = presentationReducer(state, event("text_delta", { text: "You are in /home/user" }));
    state = presentationReducer(state, event("message_stop", { stopReason: "end_turn" }));

    // All content should be in conversations, nothing in streaming
    expect(state.streaming).toBeNull();
    const allBlocks = state.conversations
      .filter((c) => c.role === "assistant")
      .flatMap((c) => (c as AssistantConversation).blocks);
    expect(allBlocks.some((b) => b.type === "text")).toBe(true);
    expect(allBlocks.some((b) => b.type === "tool")).toBe(true);
  });
});
