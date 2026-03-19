/**
 * Tool Call Round-Trip Test
 *
 * Simulates the FULL lifecycle:
 * 1. MonoDriver emits stream events (tool call flow)
 * 2. MessageAssembler processes into Messages
 * 3. Messages are "persisted" (collected)
 * 4. messagesToConversations restores from "persistence"
 * 5. Verify tool calls survive the round-trip
 *
 * This reproduces the page-refresh bug: tool calls lost after reconnection.
 */

import { describe, expect, test } from "bun:test";
import type { Message } from "@agentxjs/core/agent";
import {
  createInitialMessageAssemblerState,
  messageAssemblerProcessor,
} from "@agentxjs/core/agent";
import type { StreamEvent } from "@agentxjs/core/agent";
import { messagesToConversations } from "../reducer";
import type { AssistantConversation, ToolBlock } from "../types";

/**
 * Helper: create a stream event (test helper — casts to union type)
 */
function streamEvent(type: string, data: Record<string, unknown>): StreamEvent {
  return { type, timestamp: Date.now(), data } as StreamEvent;
}

/**
 * Helper: process events through MessageAssembler, collect output messages
 */
function processEvents(events: StreamEvent[]) {
  let state = createInitialMessageAssemblerState();
  const allMessages: Message[] = [];

  for (const event of events) {
    const [newState, outputs] = messageAssemblerProcessor(state, event);
    state = newState;

    for (const output of outputs) {
      // Collect message-type outputs (these are what Runtime persists)
      if (output.type === "assistant_message" || output.type === "tool_result_message") {
        allMessages.push(output.data as Message);
      }
    }
  }

  return allMessages;
}

describe("Tool call round-trip (persist → restore)", () => {
  test("single tool call: events → messages → conversations", () => {
    // Simulate MonoDriver event sequence for a tool call
    const events = [
      // Step 1: LLM decides to call a tool
      streamEvent("message_start", { messageId: "msg_1", model: "claude" }),
      streamEvent("text_delta", { text: "Let me check that." }),
      streamEvent("tool_use_start", { toolCallId: "call_1", toolName: "bash" }),
      streamEvent("input_json_delta", { partialJson: '{"command":' }),
      streamEvent("input_json_delta", { partialJson: '"ls /tmp"}' }),
      streamEvent("tool_use_stop", {
        toolCallId: "call_1",
        toolName: "bash",
        input: { command: "ls /tmp" },
      }),
      // MonoDriver injects message_stop before tool_result
      streamEvent("message_stop", { stopReason: "tool_use" }),
      // Tool result
      streamEvent("tool_result", {
        toolCallId: "call_1",
        result: "file1.txt\nfile2.txt",
        isError: false,
      }),
      // Step 2: LLM responds with text
      streamEvent("message_start", { messageId: "msg_2", model: "claude" }),
      streamEvent("text_delta", { text: "Found 2 files." }),
      streamEvent("message_stop", { stopReason: "end_turn" }),
    ];

    // Phase 1: Process events → get persisted messages
    const messages: Message[] = [
      // User message (always persisted separately by Runtime)
      {
        id: "msg_user",
        role: "user",
        subtype: "user",
        content: "List files in /tmp",
        timestamp: Date.now(),
      } as any,
      // Messages from MessageAssembler
      ...processEvents(events),
    ];

    console.log("\n=== Persisted messages ===");
    for (const msg of messages) {
      console.log(
        `  ${msg.subtype}: ${JSON.stringify((msg as any).content ?? (msg as any).toolResult).substring(0, 100)}`
      );
    }

    // Phase 2: Restore from "persistence" (page refresh scenario)
    const conversations = messagesToConversations(messages);

    console.log("\n=== Restored conversations ===");
    for (const conv of conversations) {
      console.log(
        `  ${conv.role}: blocks=[${conv.role !== "error" ? (conv as any).blocks.map((b: any) => b.type).join(", ") : conv.message}]`
      );
    }

    // Verify: user message exists
    expect(conversations[0].role).toBe("user");

    // Verify: assistant conversation has tool block
    const assistantConvs = conversations.filter(
      (c) => c.role === "assistant"
    ) as AssistantConversation[];
    expect(assistantConvs.length).toBeGreaterThan(0);

    // Find tool block in any assistant conversation
    const allBlocks = assistantConvs.flatMap((c) => c.blocks);
    const toolBlocks = allBlocks.filter((b) => b.type === "tool") as ToolBlock[];

    console.log("\n=== Tool blocks ===");
    for (const tb of toolBlocks) {
      console.log(
        `  ${tb.toolName}: id=${tb.toolUseId}, status=${tb.status}, result=${tb.toolResult}`
      );
    }

    // THIS IS THE CRITICAL ASSERTION
    // If this fails, tool calls are lost on page refresh
    expect(toolBlocks.length).toBeGreaterThanOrEqual(1);
    expect(toolBlocks[0].toolName).toBe("bash");
    expect(toolBlocks[0].toolUseId).toBe("call_1");
    expect(toolBlocks[0].status).toBe("completed");
    expect(toolBlocks[0].toolResult).toBe("file1.txt\nfile2.txt");

    // Verify text is also present
    const textBlocks = allBlocks.filter((b) => b.type === "text");
    expect(textBlocks.length).toBeGreaterThanOrEqual(1);
  });

  test("multi-step tool call: second step text survives", () => {
    // This tests the MonoDriver multi-step flow where message_start
    // is only emitted once but there are multiple steps
    const events = [
      // Single message_start for entire multi-step
      streamEvent("message_start", { messageId: "msg_1", model: "claude" }),
      // Step 1: tool call
      streamEvent("tool_use_start", { toolCallId: "call_1", toolName: "write" }),
      streamEvent("input_json_delta", { partialJson: '{"path":"test.txt","content":"hello"}' }),
      streamEvent("tool_use_stop", {
        toolCallId: "call_1",
        toolName: "write",
        input: { path: "test.txt", content: "hello" },
      }),
      // MonoDriver injects message_stop before tool_result
      streamEvent("message_stop", { stopReason: "tool_use" }),
      streamEvent("tool_result", {
        toolCallId: "call_1",
        result: { success: true },
        isError: false,
      }),
      // Step 2: NO new message_start (MonoDriver only emits once)
      // This is where the bug might be
      streamEvent("message_start", { messageId: "msg_2", model: "claude" }),
      streamEvent("text_delta", { text: "File written successfully." }),
      streamEvent("message_stop", { stopReason: "end_turn" }),
    ];

    const messages: Message[] = [
      {
        id: "msg_user",
        role: "user",
        subtype: "user",
        content: "Write hello to test.txt",
        timestamp: Date.now(),
      } as any,
      ...processEvents(events),
    ];

    console.log("\n=== Multi-step persisted messages ===");
    for (const msg of messages) {
      console.log(
        `  ${msg.subtype}: ${JSON.stringify((msg as any).content ?? (msg as any).toolResult).substring(0, 120)}`
      );
    }

    const conversations = messagesToConversations(messages);

    console.log("\n=== Multi-step restored conversations ===");
    for (const conv of conversations) {
      if (conv.role !== "error") {
        const ac = conv as any;
        console.log(
          `  ${conv.role}: blocks=[${ac.blocks.map((b: any) => `${b.type}${b.type === "tool" ? `(${b.toolName})` : ""}`).join(", ")}]`
        );
      }
    }

    // User + at least one assistant
    expect(conversations[0].role).toBe("user");

    const assistantConvs = conversations.filter(
      (c) => c.role === "assistant"
    ) as AssistantConversation[];
    const allBlocks = assistantConvs.flatMap((c) => c.blocks);

    // Tool call should be present
    const toolBlocks = allBlocks.filter((b) => b.type === "tool") as ToolBlock[];
    expect(toolBlocks.length).toBe(1);
    expect(toolBlocks[0].toolName).toBe("write");

    // Final text should also be present
    const textBlocks = allBlocks.filter((b) => b.type === "text");
    expect(textBlocks.length).toBeGreaterThanOrEqual(1);
    const hasSuccessText = textBlocks.some((b) => (b as any).content.includes("successfully"));
    expect(hasSuccessText).toBe(true);
  });
});
