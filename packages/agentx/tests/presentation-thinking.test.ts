/**
 * Presentation Thinking/Reasoning block tests
 */

import { describe, expect, test } from "bun:test";
import type { BusEvent } from "@agentxjs/core/event";
import { createInitialState, presentationReducer } from "../src/presentation/reducer";
import type { AssistantConversation, TextBlock } from "../src/presentation/types";

function event(type: string, data: Record<string, unknown> = {}): BusEvent {
  return { type, timestamp: Date.now(), data } as unknown as BusEvent;
}

describe("Thinking/Reasoning blocks", () => {
  test("thinking_start adds thinking block to conversation", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "test" })
    );
    state = presentationReducer(state, event("thinking_delta", { text: "Let me think..." }));

    const conv = state.conversations[0] as AssistantConversation;
    expect(conv.blocks).toHaveLength(1);
    expect(conv.blocks[0].type).toBe("thinking");
    expect((conv.blocks[0] as any).content).toBe("Let me think...");
  });

  test("thinking_delta accumulates thinking text", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "test" })
    );
    state = presentationReducer(state, event("thinking_delta", { text: "First " }));
    state = presentationReducer(state, event("thinking_delta", { text: "then second" }));

    const conv = state.conversations[0] as AssistantConversation;
    expect(conv.blocks).toHaveLength(1);
    expect((conv.blocks[0] as any).content).toBe("First then second");
  });

  test("thinking then text creates separate blocks", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "test" })
    );
    state = presentationReducer(state, event("thinking_delta", { text: "I should greet" }));
    state = presentationReducer(state, event("text_delta", { text: "Hello!" }));

    const conv = state.conversations[0] as AssistantConversation;
    expect(conv.blocks).toHaveLength(2);
    expect(conv.blocks[0].type).toBe("thinking");
    expect((conv.blocks[0] as any).content).toBe("I should greet");
    expect(conv.blocks[1].type).toBe("text");
    expect((conv.blocks[1] as TextBlock).content).toBe("Hello!");
  });

  test("thinking block updates status to thinking", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "test" })
    );
    expect(state.status).toBe("thinking");

    state = presentationReducer(state, event("thinking_delta", { text: "hmm" }));
    expect(state.status).toBe("thinking");

    state = presentationReducer(state, event("text_delta", { text: "Hi" }));
    expect(state.status).toBe("responding");
  });

  test("thinking preserved after message_stop", () => {
    let state = createInitialState();
    state = presentationReducer(
      state,
      event("message_start", { messageId: "msg_1", model: "test" })
    );
    state = presentationReducer(state, event("thinking_delta", { text: "reasoning..." }));
    state = presentationReducer(state, event("text_delta", { text: "Answer" }));
    state = presentationReducer(state, event("message_stop", { stopReason: "end_turn" }));

    const conv = state.conversations[0] as AssistantConversation;
    expect(conv.isStreaming).toBe(false);
    expect(conv.blocks).toHaveLength(2);
    expect(conv.blocks[0].type).toBe("thinking");
    expect(conv.blocks[1].type).toBe("text");
  });
});
