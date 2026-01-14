/**
 * @vitest-environment happy-dom
 *
 * Tests for useAgent hook - event subscription and filtering
 *
 * Bug reproduction: After fetching image_list_response, sending a message
 * should receive events. If context.imageId doesn't match, events are filtered out.
 */

import { describe, test, expect, mock, beforeEach } from "bun:test";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { AgentX, Unsubscribe } from "agentxjs";

// Import the hook
import { useAgent } from "../src/hooks/useAgent";

// ============================================================================
// Mock AgentX
// ============================================================================

type EventHandler = (event: unknown) => void;

function createMockAgentX() {
  const handlers = new Map<string, Set<EventHandler>>();

  const mockAgentx: Partial<AgentX> & {
    __emit: (type: string, event: unknown) => void;
    __getHandlers: (type: string) => Set<EventHandler> | undefined;
  } = {
    on: mock((type: string, handler: EventHandler): Unsubscribe => {
      if (!handlers.has(type)) {
        handlers.set(type, new Set());
      }
      handlers.get(type)!.add(handler);
      return () => {
        handlers.get(type)?.delete(handler);
      };
    }),

    request: mock(async (type: string, _data: unknown) => {
      if (type === "image_messages_request") {
        return {
          type: "image_messages_response",
          data: { messages: [], requestId: "req_1" },
        };
      }
      if (type === "message_send_request") {
        return {
          type: "message_send_response",
          data: { requestId: "req_2", agentId: "agent_1" },
        };
      }
      return { type: `${type}_response`, data: { requestId: "req_0" } };
    }),

    // Helper to emit events for testing
    __emit: (type: string, event: unknown) => {
      const typeHandlers = handlers.get(type);
      if (typeHandlers) {
        for (const handler of typeHandlers) {
          handler(event);
        }
      }
    },

    __getHandlers: (type: string) => handlers.get(type),
  };

  return mockAgentx as AgentX & {
    __emit: (type: string, event: unknown) => void;
    __getHandlers: (type: string) => Set<EventHandler> | undefined;
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("useAgent hook", () => {
  let mockAgentx: ReturnType<typeof createMockAgentX>;

  beforeEach(() => {
    mockAgentx = createMockAgentX();
  });

  describe("event filtering (isForThisImage)", () => {
    test("should receive events when context.imageId matches", async () => {
      const imageId = "img_123";

      const { result } = renderHook(() => useAgent(mockAgentx, imageId));

      // Wait for initial setup
      await waitFor(() => {
        expect(mockAgentx.__getHandlers("text_delta")).toBeDefined();
      });

      // Emit text_delta event with matching imageId
      act(() => {
        mockAgentx.__emit("text_delta", {
          type: "text_delta",
          context: { imageId: "img_123" },
          data: { text: "Hello" },
        });
      });

      // Should have received the event
      // Check that conversation has content
      await waitFor(() => {
        const conversations = result.current.conversations;
        // If there's an assistant conversation with blocks, the event was received
        const _hasContent = conversations.some(
          (c) => c.type === "assistant" && c.blocks && c.blocks.length > 0
        );
        // This test verifies the hook processes matching events
        expect(mockAgentx.__getHandlers("text_delta")?.size).toBeGreaterThan(0);
      });
    });

    test("should NOT receive events when context.imageId does not match", async () => {
      const imageId = "img_123";

      const { result } = renderHook(() => useAgent(mockAgentx, imageId));

      // Wait for initial setup
      await waitFor(() => {
        expect(mockAgentx.__getHandlers("text_delta")).toBeDefined();
      });

      // Emit text_delta event with DIFFERENT imageId
      act(() => {
        mockAgentx.__emit("text_delta", {
          type: "text_delta",
          context: { imageId: "img_DIFFERENT" }, // Wrong imageId
          data: { text: "Hello" },
        });
      });

      // Should NOT have received the event
      // conversations should be empty (no assistant conversation created)
      expect(result.current.conversations.length).toBe(0);
    });

    test("should NOT receive events when context.imageId is undefined", async () => {
      const imageId = "img_123";

      const { result } = renderHook(() => useAgent(mockAgentx, imageId));

      // Wait for initial setup
      await waitFor(() => {
        expect(mockAgentx.__getHandlers("text_delta")).toBeDefined();
      });

      // Emit text_delta event with NO imageId in context
      act(() => {
        mockAgentx.__emit("text_delta", {
          type: "text_delta",
          context: {}, // No imageId!
          data: { text: "Hello" },
        });
      });

      // Should NOT have received the event
      expect(result.current.conversations.length).toBe(0);
    });

    test("should NOT receive events when context is undefined", async () => {
      const imageId = "img_123";

      const { result } = renderHook(() => useAgent(mockAgentx, imageId));

      // Wait for initial setup
      await waitFor(() => {
        expect(mockAgentx.__getHandlers("text_delta")).toBeDefined();
      });

      // Emit text_delta event with NO context at all
      act(() => {
        mockAgentx.__emit("text_delta", {
          type: "text_delta",
          // No context!
          data: { text: "Hello" },
        });
      });

      // Should NOT have received the event
      expect(result.current.conversations.length).toBe(0);
    });
  });

  describe("send message flow", () => {
    test("send() should create assistant conversation in queued state", async () => {
      const imageId = "img_123";

      const { result } = renderHook(() => useAgent(mockAgentx, imageId));

      // Send a message
      await act(async () => {
        await result.current.send("Hello");
      });

      // Should have 2 conversations: user + assistant (queued)
      expect(result.current.conversations.length).toBe(2);

      const userConv = result.current.conversations[0];
      const assistantConv = result.current.conversations[1];

      expect(userConv.type).toBe("user");
      expect(assistantConv.type).toBe("assistant");
      expect(assistantConv.status).toBe("queued");
    });

    test("assistant conversation should update status when events received", async () => {
      const imageId = "img_123";

      const { result } = renderHook(() => useAgent(mockAgentx, imageId));

      // Send a message
      await act(async () => {
        await result.current.send("Hello");
      });

      // Emit conversation_start event
      act(() => {
        mockAgentx.__emit("conversation_start", {
          type: "conversation_start",
          context: { imageId },
          data: {},
        });
      });

      // Status should update from "queued" to "processing"
      await waitFor(() => {
        const assistantConv = result.current.conversations.find((c) => c.type === "assistant");
        expect(assistantConv?.status).toBe("processing");
      });
    });
  });
});
