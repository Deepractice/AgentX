/**
 * Tool Call History Restore Tests
 *
 * Verifies that messagesToConversations correctly restores
 * tool calls from persisted messages (page refresh scenario).
 */

import { describe, expect, test } from "bun:test";
import type {
  AssistantMessage,
  Message,
  ToolResultMessage,
  UserMessage,
} from "@agentxjs/core/agent";
import { messagesToConversations } from "../reducer";
import type { AssistantConversation, ToolBlock } from "../types";

describe("Tool call history restore", () => {
  test("restores single tool call with result", () => {
    const messages: Message[] = [
      {
        id: "msg_1",
        role: "user",
        subtype: "user",
        content: "List files in /tmp",
        timestamp: 1000,
      } as UserMessage,
      {
        id: "msg_2",
        role: "assistant",
        subtype: "assistant",
        content: [
          { type: "text", text: "Let me check that for you." },
          { type: "tool-call", id: "call_1", name: "bash", input: { command: "ls /tmp" } },
        ],
        timestamp: 2000,
      } as AssistantMessage,
      {
        id: "msg_3",
        role: "tool",
        subtype: "tool-result",
        toolCallId: "call_1",
        toolResult: {
          type: "tool-result",
          id: "call_1",
          name: "bash",
          output: { type: "text", value: "file1.txt\nfile2.txt" },
        },
        timestamp: 3000,
      } as ToolResultMessage,
      {
        id: "msg_4",
        role: "assistant",
        subtype: "assistant",
        content: [{ type: "text", text: "Found 2 files." }],
        timestamp: 4000,
      } as AssistantMessage,
    ];

    const conversations = messagesToConversations(messages);

    // Should be: user + assistant (with tool call + text)
    expect(conversations.length).toBe(2);
    expect(conversations[0].role).toBe("user");
    expect(conversations[1].role).toBe("assistant");

    const assistant = conversations[1] as AssistantConversation;
    // Blocks: text + tool + text (all in one assistant turn)
    const toolBlock = assistant.blocks.find((b) => b.type === "tool") as ToolBlock;
    expect(toolBlock).toBeDefined();
    expect(toolBlock.toolName).toBe("bash");
    expect(toolBlock.toolUseId).toBe("call_1");
    expect(toolBlock.toolResult).toBe("file1.txt\nfile2.txt");
    expect(toolBlock.status).toBe("completed");
  });

  test("restores multiple tool calls in sequence", () => {
    const messages: Message[] = [
      {
        id: "msg_1",
        role: "user",
        subtype: "user",
        content: "Read two files",
        timestamp: 1000,
      } as UserMessage,
      {
        id: "msg_2",
        role: "assistant",
        subtype: "assistant",
        content: [
          { type: "tool-call", id: "call_1", name: "read", input: { path: "a.txt" } },
          { type: "tool-call", id: "call_2", name: "read", input: { path: "b.txt" } },
        ],
        timestamp: 2000,
      } as AssistantMessage,
      {
        id: "msg_3",
        role: "tool",
        subtype: "tool-result",
        toolCallId: "call_1",
        toolResult: {
          type: "tool-result",
          id: "call_1",
          name: "read",
          output: { type: "text", value: "content A" },
        },
        timestamp: 3000,
      } as ToolResultMessage,
      {
        id: "msg_4",
        role: "tool",
        subtype: "tool-result",
        toolCallId: "call_2",
        toolResult: {
          type: "tool-result",
          id: "call_2",
          name: "read",
          output: { type: "text", value: "content B" },
        },
        timestamp: 3001,
      } as ToolResultMessage,
      {
        id: "msg_5",
        role: "assistant",
        subtype: "assistant",
        content: [{ type: "text", text: "Both files read." }],
        timestamp: 4000,
      } as AssistantMessage,
    ];

    const conversations = messagesToConversations(messages);

    expect(conversations.length).toBe(2);
    const assistant = conversations[1] as AssistantConversation;
    const toolBlocks = assistant.blocks.filter((b) => b.type === "tool") as ToolBlock[];
    expect(toolBlocks.length).toBe(2);
    expect(toolBlocks[0].toolResult).toBe("content A");
    expect(toolBlocks[1].toolResult).toBe("content B");
  });

  test("restores tool call with error result", () => {
    const messages: Message[] = [
      {
        id: "msg_1",
        role: "user",
        subtype: "user",
        content: "Run something",
        timestamp: 1000,
      } as UserMessage,
      {
        id: "msg_2",
        role: "assistant",
        subtype: "assistant",
        content: [{ type: "tool-call", id: "call_1", name: "bash", input: { command: "bad" } }],
        timestamp: 2000,
      } as AssistantMessage,
      {
        id: "msg_3",
        role: "tool",
        subtype: "tool-result",
        toolCallId: "call_1",
        toolResult: {
          type: "tool-result",
          id: "call_1",
          name: "bash",
          output: { type: "error-text", value: "command not found" },
        },
        timestamp: 3000,
      } as ToolResultMessage,
    ];

    const conversations = messagesToConversations(messages);
    const assistant = conversations[1] as AssistantConversation;
    const toolBlock = assistant.blocks.find((b) => b.type === "tool") as ToolBlock;
    expect(toolBlock.status).toBe("error");
    expect(toolBlock.toolResult).toBe("command not found");
  });

  test("handles assistant message with only text (no tools)", () => {
    const messages: Message[] = [
      {
        id: "msg_1",
        role: "user",
        subtype: "user",
        content: "Hello",
        timestamp: 1000,
      } as UserMessage,
      {
        id: "msg_2",
        role: "assistant",
        subtype: "assistant",
        content: [{ type: "text", text: "Hi there!" }],
        timestamp: 2000,
      } as AssistantMessage,
    ];

    const conversations = messagesToConversations(messages);
    expect(conversations.length).toBe(2);
    const assistant = conversations[1] as AssistantConversation;
    expect(assistant.blocks.length).toBe(1);
    expect(assistant.blocks[0].type).toBe("text");
  });
});
