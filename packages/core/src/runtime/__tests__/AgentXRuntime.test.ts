/**
 * AgentXRuntime.test.ts - AgentEngine pipeline integration
 *
 * Verifies that the Runtime properly integrates with the
 * AgentEngine pipeline (Source → MealyMachine → Presenter):
 * - Message events (assistant_message, tool_result_message)
 * - State events (conversation_start, conversation_end)
 * - Turn events (turn_request, turn_response)
 * - Message persistence (user + assistant + tool messages)
 */

import { afterEach, describe, expect, it } from "bun:test";
import type { Message } from "../../agent/types";
import type { DriverStreamEvent } from "../../driver/types";
import { EventBusImpl as EventBus } from "../../event/EventBus";
import type { BusEvent } from "../../event/types";
import type { AgentXPlatform } from "../../platform/types";
import { createAgentXRuntime } from "../AgentXRuntime";

// ============================================================================
// Mock Helpers
// ============================================================================

/**
 * Create a mock Driver that yields predefined stream events
 */
function createMockDriver(events: DriverStreamEvent[]) {
  return {
    name: "MockDriver",
    initialize: async () => {},
    receive: async function* () {
      for (const event of events) {
        yield event;
      }
    },
    interrupt: () => {},
    dispose: async () => {},
  };
}

/**
 * Simple text response: message_start → text_delta → message_stop
 */
function simpleTextResponse(text: string): DriverStreamEvent[] {
  return [
    {
      type: "message_start",
      data: { messageId: "msg_test_1", model: "test-model" },
    },
    {
      type: "text_delta",
      data: { text },
    },
    {
      type: "message_stop",
      data: { stopReason: "end_turn" },
    },
  ] as DriverStreamEvent[];
}

/**
 * In-memory SessionRepository
 */
function createMockSessionRepository() {
  const sessions = new Map<string, { messages: Message[] }>();

  return {
    saveSession: async (record: { sessionId: string }) => {
      if (!sessions.has(record.sessionId)) {
        sessions.set(record.sessionId, { messages: [] });
      }
    },
    findSessionById: async (sessionId: string) => {
      return sessions.has(sessionId) ? { sessionId } : null;
    },
    findSessionsByImageId: async () => [],
    findSessionsByContainerId: async () => [],
    deleteSession: async () => {},
    addMessage: async (sessionId: string, message: Message) => {
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, { messages: [] });
      }
      sessions.get(sessionId)!.messages.push(message);
    },
    getMessages: async (sessionId: string) => {
      return sessions.get(sessionId)?.messages ?? [];
    },
    clearMessages: async () => {},

    // Helper for test assertions
    _getMessages: (sessionId: string) => sessions.get(sessionId)?.messages ?? [],
  };
}

/**
 * Minimal mock platform
 */
function createMockPlatform(driverEvents: DriverStreamEvent[]) {
  const eventBus = new EventBus();
  const sessionRepo = createMockSessionRepository();

  const platform: AgentXPlatform = {
    containerRepository: {
      createContainer: async () => {},
      containerExists: async () => true,
      findAllContainers: async () => [],
      deleteContainer: async () => {},
    },
    imageRepository: {
      saveImage: async () => {},
      findImageById: async (imageId: string) => ({
        imageId,
        containerId: "container_1",
        sessionId: "session_1",
        name: "TestBot",
        systemPrompt: "You are a test bot.",
        createdAt: Date.now(),
      }),
      findImagesByContainerId: async () => [],
      deleteImage: async () => {},
      updateMetadata: async () => {},
    },
    sessionRepository: sessionRepo,
    eventBus,
  };

  const runtime = createAgentXRuntime(platform, () => createMockDriver(driverEvents));

  return { platform, runtime, eventBus, sessionRepo };
}

// ============================================================================
// Tests
// ============================================================================

describe("AgentXRuntime - AgentEngine Pipeline", () => {
  let env: ReturnType<typeof createMockPlatform>;

  afterEach(async () => {
    await env.runtime.shutdown();
  });

  describe("message event emission", () => {
    it("should emit assistant_message event after text response", async () => {
      env = createMockPlatform(simpleTextResponse("Hello from assistant"));

      const agent = await env.runtime.createAgent({ imageId: "img_1" });

      const events: BusEvent[] = [];
      env.eventBus.onAny((event) => {
        events.push(event as BusEvent);
      });

      await env.runtime.receive(agent.agentId, "Hi");

      // Wait for async processing
      await new Promise((r) => setTimeout(r, 50));

      const messageTypes = events.map((e) => e.type);

      // Runtime should produce assistant_message via MealyMachine → Presenter
      expect(messageTypes).toContain("assistant_message");
    });

    it("should emit assistant_message with tool calls and tool_result_message", async () => {
      const toolEvents: DriverStreamEvent[] = [
        {
          type: "message_start",
          data: { messageId: "msg_tool", model: "test-model" },
        },
        {
          type: "tool_use_start",
          data: { toolCallId: "tc_1", toolName: "get_weather" },
        },
        {
          type: "input_json_delta",
          data: { partialJson: '{"city":"Tokyo"}' },
        },
        {
          type: "tool_use_stop",
          data: { toolCallId: "tc_1", toolName: "get_weather", input: { city: "Tokyo" } },
        },
        {
          type: "message_stop",
          data: { stopReason: "tool_use" },
        },
        {
          type: "tool_result",
          data: { toolCallId: "tc_1", result: "Sunny, 25°C", isError: false },
        },
      ] as DriverStreamEvent[];

      env = createMockPlatform(toolEvents);

      const agent = await env.runtime.createAgent({ imageId: "img_1" });

      const events: BusEvent[] = [];
      env.eventBus.onAny((event) => {
        events.push(event as BusEvent);
      });

      await env.runtime.receive(agent.agentId, "What's the weather?");
      await new Promise((r) => setTimeout(r, 50));

      const messageTypes = events.map((e) => e.type);
      // Tool calls are now part of assistant_message, not separate tool_call_message
      expect(messageTypes).toContain("assistant_message");
      expect(messageTypes).toContain("tool_result_message");
      expect(messageTypes).not.toContain("tool_call_message");

      // Verify assistant message contains tool call in content
      const assistantEvent = events.find((e) => e.type === "assistant_message");
      const content = (assistantEvent?.data as { content: unknown[] })?.content;
      expect(content).toBeDefined();
      const toolCallPart = content?.find(
        (p: unknown) => (p as { type: string }).type === "tool-call"
      );
      expect(toolCallPart).toBeDefined();
    });
  });

  describe("state event emission", () => {
    it("should emit conversation lifecycle events", async () => {
      env = createMockPlatform(simpleTextResponse("Hello"));

      const agent = await env.runtime.createAgent({ imageId: "img_1" });

      const events: BusEvent[] = [];
      env.eventBus.onAny((event) => {
        events.push(event as BusEvent);
      });

      await env.runtime.receive(agent.agentId, "Hi");
      await new Promise((r) => setTimeout(r, 50));

      const types = events.map((e) => e.type);

      // MealyMachine should produce state events
      expect(types).toContain("conversation_start");
      expect(types).toContain("conversation_end");
    });
  });

  describe("message persistence", () => {
    it("should persist user message to session", async () => {
      env = createMockPlatform(simpleTextResponse("Hello"));

      const agent = await env.runtime.createAgent({ imageId: "img_1" });
      await env.runtime.receive(agent.agentId, "Hi");
      await new Promise((r) => setTimeout(r, 50));

      const messages = env.sessionRepo._getMessages("session_1");
      const userMessages = messages.filter((m) => m.subtype === "user");

      expect(userMessages.length).toBe(1);
    });

    it("should persist assistant message to session", async () => {
      env = createMockPlatform(simpleTextResponse("Hello from assistant"));

      const agent = await env.runtime.createAgent({ imageId: "img_1" });
      await env.runtime.receive(agent.agentId, "Hi");
      await new Promise((r) => setTimeout(r, 50));

      const messages = env.sessionRepo._getMessages("session_1");
      const assistantMessages = messages.filter((m) => m.subtype === "assistant");

      expect(assistantMessages.length).toBe(1);
    });

    it("should persist tool_call and tool_result messages to session", async () => {
      const toolEvents: DriverStreamEvent[] = [
        {
          type: "message_start",
          data: { messageId: "msg_tool", model: "test-model" },
        },
        {
          type: "tool_use_start",
          data: { toolCallId: "tc_1", toolName: "bash" },
        },
        {
          type: "input_json_delta",
          data: { partialJson: '{"cmd":"ls"}' },
        },
        {
          type: "tool_use_stop",
          data: { toolCallId: "tc_1", toolName: "bash", input: { cmd: "ls" } },
        },
        {
          type: "tool_result",
          data: { toolCallId: "tc_1", result: "file.txt", isError: false },
        },
        {
          type: "message_stop",
          data: { stopReason: "end_turn" },
        },
      ] as DriverStreamEvent[];

      env = createMockPlatform(toolEvents);

      const agent = await env.runtime.createAgent({ imageId: "img_1" });
      await env.runtime.receive(agent.agentId, "List files");
      await new Promise((r) => setTimeout(r, 50));

      const messages = env.sessionRepo._getMessages("session_1");
      // Tool calls are inside assistant message content, not separate messages
      const assistantMessages = messages.filter((m) => m.subtype === "assistant");
      const toolResultMessages = messages.filter((m) => m.subtype === "tool-result");

      expect(assistantMessages.length).toBeGreaterThanOrEqual(1);
      // Verify at least one assistant message has a tool-call part
      const hasToolCall = assistantMessages.some((m) => {
        const content = (m as { content: unknown }).content;
        return (
          Array.isArray(content) &&
          content.some((p: unknown) => (p as { type: string }).type === "tool-call")
        );
      });
      expect(hasToolCall).toBe(true);
      expect(toolResultMessages.length).toBe(1);
    });
  });

  describe("turn tracking", () => {
    it("should emit turn_request and turn_response events", async () => {
      env = createMockPlatform(simpleTextResponse("Hello"));

      const agent = await env.runtime.createAgent({ imageId: "img_1" });

      const events: BusEvent[] = [];
      env.eventBus.onAny((event) => {
        events.push(event as BusEvent);
      });

      await env.runtime.receive(agent.agentId, "Hi");
      await new Promise((r) => setTimeout(r, 50));

      const types = events.map((e) => e.type);
      expect(types).toContain("turn_request");
      expect(types).toContain("turn_response");
    });
  });
});
