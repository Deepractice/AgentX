/**
 * Status Transition Tests
 *
 * Verifies PresentationState.status transitions correctly through
 * the full event lifecycle: idle → submitted → thinking → responding → idle
 */

import { describe, expect, test } from "bun:test";
import { addUserConversation, createInitialState, presentationReducer } from "../reducer";

function event(type: string, data: Record<string, unknown> = {}) {
  return { type, timestamp: Date.now(), data } as any;
}

describe("Status transitions", () => {
  test("initial state is idle", () => {
    const state = createInitialState();
    expect(state.status).toBe("idle");
  });

  test("addUserConversation sets submitted", () => {
    const state = createInitialState();
    const next = addUserConversation(state, "Hello");
    expect(next.status).toBe("submitted");
  });

  test("message_start sets submitted", () => {
    const state = createInitialState();
    const next = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "claude" })
    );
    expect(next.status).toBe("submitted");
  });

  test("thinking_delta transitions to thinking", () => {
    // Start from submitted (after message_start)
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "claude" })
    );
    expect(state.status).toBe("submitted");

    state = presentationReducer(state, event("thinking_delta", { text: "Let me think..." }));
    expect(state.status).toBe("thinking");
  });

  test("text_delta transitions to responding", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "claude" })
    );
    state = presentationReducer(state, event("text_delta", { text: "Hello!" }));
    expect(state.status).toBe("responding");
  });

  test("tool_use_start transitions to executing", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "claude" })
    );
    state = presentationReducer(
      state,
      event("tool_use_start", { toolCallId: "call_1", toolName: "bash" })
    );
    expect(state.status).toBe("executing");
  });

  test("message_stop with end_turn transitions to idle", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "claude" })
    );
    state = presentationReducer(state, event("text_delta", { text: "Hello!" }));
    state = presentationReducer(state, event("message_stop", { stopReason: "end_turn" }));
    expect(state.status).toBe("idle");
  });

  test("message_stop with tool_use stays executing", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "claude" })
    );
    state = presentationReducer(
      state,
      event("tool_use_start", { toolCallId: "call_1", toolName: "bash" })
    );
    state = presentationReducer(
      state,
      event("tool_use_stop", { toolCallId: "call_1", toolName: "bash", input: {} })
    );
    state = presentationReducer(state, event("message_stop", { stopReason: "tool_use" }));
    expect(state.status).toBe("executing");
  });

  test("full lifecycle: idle → submitted → thinking → responding → idle", () => {
    let state = createInitialState();
    expect(state.status).toBe("idle");

    // User sends message
    state = addUserConversation(state, "Explain quantum physics");
    expect(state.status).toBe("submitted");

    // LLM starts
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "claude" })
    );
    expect(state.status).toBe("submitted");

    // Thinking phase
    state = presentationReducer(state, event("thinking_delta", { text: "Hmm..." }));
    expect(state.status).toBe("thinking");

    state = presentationReducer(state, event("thinking_delta", { text: " let me explain" }));
    expect(state.status).toBe("thinking");

    // Responding phase
    state = presentationReducer(state, event("text_delta", { text: "Quantum physics is..." }));
    expect(state.status).toBe("responding");

    state = presentationReducer(state, event("text_delta", { text: " the study of..." }));
    expect(state.status).toBe("responding");

    // Done
    state = presentationReducer(state, event("message_stop", { stopReason: "end_turn" }));
    expect(state.status).toBe("idle");
  });

  test("full lifecycle with tool call: idle → submitted → executing → responding → idle", () => {
    let state = createInitialState();

    state = addUserConversation(state, "List files");
    expect(state.status).toBe("submitted");

    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "claude" })
    );
    expect(state.status).toBe("submitted");

    // Tool call
    state = presentationReducer(
      state,
      event("tool_use_start", { toolCallId: "call_1", toolName: "bash" })
    );
    expect(state.status).toBe("executing");

    state = presentationReducer(
      state,
      event("tool_use_stop", { toolCallId: "call_1", toolName: "bash", input: { command: "ls" } })
    );
    expect(state.status).toBe("executing");

    // message_stop(tool_use) — stays executing
    state = presentationReducer(state, event("message_stop", { stopReason: "tool_use" }));
    expect(state.status).toBe("executing");

    // Tool result
    state = presentationReducer(
      state,
      event("tool_result", { toolCallId: "call_1", result: "file.txt", isError: false })
    );
    expect(state.status).toBe("responding");

    // Second step: text response
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_2", model: "claude" })
    );
    expect(state.status).toBe("submitted");

    state = presentationReducer(state, event("text_delta", { text: "Found one file." }));
    expect(state.status).toBe("responding");

    state = presentationReducer(state, event("message_stop", { stopReason: "end_turn" }));
    expect(state.status).toBe("idle");
  });

  test("error transitions to idle", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "claude" })
    );
    state = presentationReducer(state, event("error", { message: "API error" }));
    expect(state.status).toBe("idle");
  });

  test("interrupted transitions to idle", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "claude" })
    );
    state = presentationReducer(state, event("text_delta", { text: "Hello" }));
    state = presentationReducer(state, event("interrupted", { reason: "user" }));
    expect(state.status).toBe("idle");
  });
});
