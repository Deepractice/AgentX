/**
 * Engine flush() behavior-boundary persistence tests
 *
 * Verifies that flush() correctly assembles partial content
 * at all behavior boundaries: normal completion, interrupt, error.
 */

import { describe, expect, test } from "bun:test";
import { MealyMachine } from "../../src/agent/engine/MealyMachine";
import type { StreamEvent } from "../../src/agent/types";

const INSTANCE = "test-agent";

function event(type: string, data: Record<string, unknown> = {}): StreamEvent {
  return { type, timestamp: Date.now(), data } as StreamEvent;
}

describe("MealyMachine.flush()", () => {
  // ==================== Normal completion ====================

  test("flush after normal completion returns empty (already assembled by message_stop)", () => {
    const machine = new MealyMachine();

    // Normal flow: start → text → stop
    machine.process(INSTANCE, event("message_start", { messageId: "msg_1", model: "test" }));
    machine.process(INSTANCE, event("text_delta", { text: "Hello " }));
    machine.process(INSTANCE, event("text_delta", { text: "world" }));

    const stopOutputs = machine.process(
      INSTANCE,
      event("message_stop", { stopReason: "end_turn" })
    );

    // message_stop should have produced assistant_message
    const assistantMsg = stopOutputs.find((o) => o.type === "assistant_message");
    expect(assistantMsg).toBeTruthy();
    expect((assistantMsg!.data as any).content[0].text).toBe("Hello world");

    // flush after completion → empty (state already reset)
    const flushed = machine.flush(INSTANCE);
    expect(flushed).toHaveLength(0);
  });

  // ==================== Interrupt ====================

  test("flush after interrupt assembles partial text content", () => {
    const machine = new MealyMachine();

    // Start streaming
    machine.process(INSTANCE, event("message_start", { messageId: "msg_2", model: "test" }));
    machine.process(INSTANCE, event("text_delta", { text: "The answer is " }));
    machine.process(INSTANCE, event("text_delta", { text: "42 because" }));

    // Interrupt! No message_stop received.
    // In real flow, driver yields "interrupted" then stops.
    // MealyMachine ignores "interrupted" (falls to default case).
    machine.process(INSTANCE, event("interrupted", { reason: "user" }));

    // flush() should assemble partial content
    const flushed = machine.flush(INSTANCE);
    expect(flushed).toHaveLength(1);
    expect(flushed[0].type).toBe("assistant_message");

    const msg = flushed[0].data as any;
    expect(msg.id).toBe("msg_2");
    expect(msg.content).toHaveLength(1);
    expect(msg.content[0].type).toBe("text");
    expect(msg.content[0].text).toBe("The answer is 42 because");
  });

  // ==================== Idempotent ====================

  test("flush is idempotent — second call returns empty", () => {
    const machine = new MealyMachine();

    machine.process(INSTANCE, event("message_start", { messageId: "msg_3", model: "test" }));
    machine.process(INSTANCE, event("text_delta", { text: "partial" }));

    // First flush
    const first = machine.flush(INSTANCE);
    expect(first).toHaveLength(1);

    // Second flush — state already reset
    const second = machine.flush(INSTANCE);
    expect(second).toHaveLength(0);
  });

  // ==================== No pending content ====================

  test("flush with no pending content returns empty", () => {
    const machine = new MealyMachine();

    // No events processed at all
    const flushed = machine.flush(INSTANCE);
    expect(flushed).toHaveLength(0);
  });

  test("flush with no state for instance returns empty", () => {
    const machine = new MealyMachine();
    const flushed = machine.flush("nonexistent");
    expect(flushed).toHaveLength(0);
  });

  // ==================== Partial tool use ====================

  test("flush with completed tool call preserves tool content", () => {
    const machine = new MealyMachine();

    machine.process(INSTANCE, event("message_start", { messageId: "msg_4", model: "test" }));
    machine.process(INSTANCE, event("text_delta", { text: "Let me help. " }));
    machine.process(INSTANCE, event("tool_use_start", { toolCallId: "tc_1", toolName: "bash" }));
    machine.process(INSTANCE, event("input_json_delta", { partialJson: '{"command":' }));
    machine.process(INSTANCE, event("input_json_delta", { partialJson: '"ls -la"}' }));
    machine.process(INSTANCE, event("tool_use_stop", { toolCallId: "tc_1", toolName: "bash" }));

    // Interrupted before message_stop
    const flushed = machine.flush(INSTANCE);
    expect(flushed).toHaveLength(1);

    const msg = flushed[0].data as any;
    expect(msg.content).toHaveLength(2);
    expect(msg.content[0].type).toBe("text");
    expect(msg.content[0].text).toBe("Let me help. ");
    expect(msg.content[1].type).toBe("tool-call");
    expect(msg.content[1].name).toBe("bash");
    expect(msg.content[1].input).toEqual({ command: "ls -la" });
  });

  test("flush with incomplete tool JSON handles gracefully", () => {
    const machine = new MealyMachine();

    machine.process(INSTANCE, event("message_start", { messageId: "msg_5", model: "test" }));
    machine.process(INSTANCE, event("tool_use_start", { toolCallId: "tc_2", toolName: "search" }));
    machine.process(INSTANCE, event("input_json_delta", { partialJson: '{"query": "hel' }));
    // Interrupted mid-JSON — toolInputJson is incomplete

    const flushed = machine.flush(INSTANCE);
    expect(flushed).toHaveLength(1);

    const msg = flushed[0].data as any;
    expect(msg.content).toHaveLength(1);
    expect(msg.content[0].type).toBe("tool-call");
    expect(msg.content[0].name).toBe("search");
    // Incomplete JSON → empty input (graceful fallback)
    expect(msg.content[0].input).toEqual({});
  });

  // ==================== Empty text ====================

  test("flush with only whitespace text returns empty", () => {
    const machine = new MealyMachine();

    machine.process(INSTANCE, event("message_start", { messageId: "msg_6", model: "test" }));
    machine.process(INSTANCE, event("text_delta", { text: "   " }));
    machine.process(INSTANCE, event("text_delta", { text: "\n" }));

    const flushed = machine.flush(INSTANCE);
    // Only whitespace — no meaningful content to persist
    expect(flushed).toHaveLength(0);
  });

  // ==================== Multi-turn consistency ====================

  test("flush does not affect subsequent turns", () => {
    const machine = new MealyMachine();

    // Turn 1: interrupted
    machine.process(INSTANCE, event("message_start", { messageId: "msg_7", model: "test" }));
    machine.process(INSTANCE, event("text_delta", { text: "partial turn 1" }));
    const flushed = machine.flush(INSTANCE);
    expect(flushed).toHaveLength(1);
    expect((flushed[0].data as any).content[0].text).toBe("partial turn 1");

    // Turn 2: normal completion — should work fine
    machine.process(INSTANCE, event("message_start", { messageId: "msg_8", model: "test" }));
    machine.process(INSTANCE, event("text_delta", { text: "complete turn 2" }));
    const stopOutputs = machine.process(
      INSTANCE,
      event("message_stop", { stopReason: "end_turn" })
    );

    const assistantMsg = stopOutputs.find((o) => o.type === "assistant_message");
    expect(assistantMsg).toBeTruthy();
    expect((assistantMsg!.data as any).content[0].text).toBe("complete turn 2");

    // flush after turn 2 → empty
    expect(machine.flush(INSTANCE)).toHaveLength(0);
  });

  // ==================== Mixed text + tool ====================

  test("flush with interleaved text and tool parts preserves order", () => {
    const machine = new MealyMachine();

    machine.process(INSTANCE, event("message_start", { messageId: "msg_9", model: "test" }));
    machine.process(INSTANCE, event("text_delta", { text: "First " }));
    machine.process(INSTANCE, event("tool_use_start", { toolCallId: "tc_3", toolName: "read" }));
    machine.process(INSTANCE, event("input_json_delta", { partialJson: '{"path":"a.txt"}' }));
    machine.process(INSTANCE, event("tool_use_stop", { toolCallId: "tc_3", toolName: "read" }));
    machine.process(INSTANCE, event("text_delta", { text: "then more text" }));

    // Interrupted with mixed content
    const flushed = machine.flush(INSTANCE);
    const msg = flushed[0].data as any;

    expect(msg.content).toHaveLength(3);
    expect(msg.content[0]).toEqual({ type: "text", text: "First " });
    expect(msg.content[1].type).toBe("tool-call");
    expect(msg.content[1].name).toBe("read");
    expect(msg.content[2]).toEqual({ type: "text", text: "then more text" });
  });
});
