/**
 * createAgent.test.ts - Unit tests for createAgent factory
 *
 * Tests the AgentEngine creation and event processing via EventBus.
 * Uses MockEventBus to simulate Driver behavior.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { createAgent } from "../createAgent";
import type {
  AgentEventBus,
  UserMessage,
  StreamEvent,
  AgentOutput,
  CreateAgentOptions,
} from "../types";

/**
 * MockEventBus - Simulates EventBus for testing
 *
 * Flow:
 * 1. agent.receive() emits user_message to bus
 * 2. MockEventBus captures user_message and triggers Driver simulation
 * 3. MockEventBus emits StreamEvents (simulating Driver)
 * 4. Source subscribes to StreamEvents and forwards to AgentEngine
 * 5. AgentEngine processes and emits AgentOutput via Presenter
 */
class MockEventBus implements AgentEventBus {
  private handlers: Map<string, Set<(event: unknown) => void>> = new Map();
  private anyHandlers: Set<(event: unknown) => void> = new Set();

  // Events captured for assertions
  readonly emittedEvents: unknown[] = [];

  // Configure stream events to emit when user_message is received
  private streamEventsToEmit: StreamEvent[] = [];

  constructor(streamEvents: StreamEvent[] = []) {
    this.streamEventsToEmit = streamEvents;
  }

  setStreamEvents(events: StreamEvent[]): void {
    this.streamEventsToEmit = events;
  }

  emit(event: unknown): void {
    this.emittedEvents.push(event);

    const e = event as { type?: string };
    const type = e.type;

    // When user_message is received, simulate Driver behavior
    // by emitting configured StreamEvents
    if (type === "user_message") {
      // Emit stream events asynchronously (simulating LLM response)
      setTimeout(() => {
        for (const streamEvent of this.streamEventsToEmit) {
          this.emitInternal(streamEvent);
        }
      }, 0);
    }

    // Notify handlers
    if (type) {
      const typeHandlers = this.handlers.get(type);
      if (typeHandlers) {
        for (const handler of typeHandlers) {
          handler(event);
        }
      }
    }

    for (const handler of this.anyHandlers) {
      handler(event);
    }
  }

  /**
   * Internal emit without triggering user_message handling
   * Adds source: "driver" and category: "stream" to simulate Driver behavior
   */
  private emitInternal(event: unknown): void {
    // Add source: "driver" and category: "stream" to simulate DriveableEvent
    const eventWithSource = {
      ...(event as object),
      source: "driver",
      category: "stream",
      intent: "notification",
    };
    this.emittedEvents.push(eventWithSource);

    const e = eventWithSource as { type?: string };
    const type = e.type;

    if (type) {
      const typeHandlers = this.handlers.get(type);
      if (typeHandlers) {
        for (const handler of typeHandlers) {
          handler(eventWithSource);
        }
      }
    }

    for (const handler of this.anyHandlers) {
      handler(eventWithSource);
    }
  }

  on(type: string, handler: (event: unknown) => void): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  onAny(handler: (event: unknown) => void): () => void {
    this.anyHandlers.add(handler);
    return () => this.anyHandlers.delete(handler);
  }

  /**
   * Get emitted events of a specific type
   */
  getEvents(type: string): unknown[] {
    return this.emittedEvents.filter((e) => (e as { type?: string }).type === type);
  }

  /**
   * Wait for stream events to be processed
   */
  async waitForProcessing(): Promise<void> {
    // Wait for setTimeout callbacks
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

// Helper to create stream events
function createStreamEvent(type: string, data: unknown = {}): StreamEvent {
  return { type, data, timestamp: Date.now() } as StreamEvent;
}

// Create a simple message flow (message_start -> text_delta -> message_stop)
function createSimpleMessageFlow(text: string, messageId = "msg_1"): StreamEvent[] {
  return [
    createStreamEvent("message_start", { messageId }),
    createStreamEvent("text_delta", { text }),
    createStreamEvent("message_stop", { stopReason: "end_turn" }),
  ];
}

describe("createAgent", () => {
  let bus: MockEventBus;
  let options: CreateAgentOptions;

  beforeEach(() => {
    bus = new MockEventBus(createSimpleMessageFlow("Hello, world!"));
    options = { bus };
  });

  describe("creation", () => {
    it("should create an agent with unique ID", () => {
      const agent1 = createAgent(options);
      const agent2 = createAgent(options);

      expect(agent1.agentId).toBeDefined();
      expect(agent2.agentId).toBeDefined();
      expect(agent1.agentId).not.toBe(agent2.agentId);
    });

    it("should create agent with createdAt timestamp", () => {
      const before = Date.now();
      const agent = createAgent(options);
      const after = Date.now();

      expect(agent.createdAt).toBeGreaterThanOrEqual(before);
      expect(agent.createdAt).toBeLessThanOrEqual(after);
    });

    it("should start in idle state", () => {
      const agent = createAgent(options);

      expect(agent.state).toBe("idle");
    });

    it("should have empty message queue", () => {
      const agent = createAgent(options);

      expect(agent.messageQueue.isEmpty).toBe(true);
      expect(agent.messageQueue.length).toBe(0);
    });
  });

  describe("receive", () => {
    it("should emit user_message to EventBus", async () => {
      const agent = createAgent(options);

      await agent.receive("Hello");

      const userMessages = bus.getEvents("user_message");
      expect(userMessages.length).toBe(1);
    });

    it("should process string message", async () => {
      const outputs: AgentOutput[] = [];
      const agent = createAgent(options);
      agent.on((e) => outputs.push(e));

      await agent.receive("Hello");
      await bus.waitForProcessing();

      expect(outputs.length).toBeGreaterThan(0);
    });

    it("should process UserMessage object", async () => {
      const outputs: AgentOutput[] = [];
      const agent = createAgent(options);
      agent.on((e) => outputs.push(e));

      const userMessage: UserMessage = {
        id: "custom_msg_1",
        role: "user",
        subtype: "user",
        content: "Hello",
        timestamp: Date.now(),
      };

      await agent.receive(userMessage);
      await bus.waitForProcessing();

      expect(outputs.length).toBeGreaterThan(0);
    });

    it("should emit stream events through presenter", async () => {
      const events = [
        createStreamEvent("message_start", { messageId: "msg_1" }),
        createStreamEvent("text_delta", { text: "Hi" }),
        createStreamEvent("message_stop", { stopReason: "end_turn" }),
      ];

      const mockBus = new MockEventBus(events);
      const outputs: AgentOutput[] = [];
      const agent = createAgent({ bus: mockBus });
      agent.on((e) => outputs.push(e));

      await agent.receive("Hello");
      await mockBus.waitForProcessing();

      const types = outputs.map((o) => o.type);
      expect(types).toContain("message_start");
      expect(types).toContain("text_delta");
      expect(types).toContain("message_stop");
    });

    it("should emit state events from processor", async () => {
      const outputs: AgentOutput[] = [];
      const agent = createAgent(options);
      agent.on((e) => outputs.push(e));

      await agent.receive("Hello");
      await bus.waitForProcessing();

      const types = outputs.map((o) => o.type);
      expect(types).toContain("conversation_start");
      expect(types).toContain("conversation_responding");
      expect(types).toContain("conversation_end");
    });

    it("should emit message events from processor", async () => {
      const outputs: AgentOutput[] = [];
      const agent = createAgent(options);
      agent.on((e) => outputs.push(e));

      await agent.receive("Hello");
      await bus.waitForProcessing();

      const types = outputs.map((o) => o.type);
      expect(types).toContain("assistant_message");
    });
  });

  describe("state transitions", () => {
    it("should transition through states during message processing", async () => {
      const states: string[] = [];
      const agent = createAgent(options);

      agent.onStateChange((change) => {
        states.push(change.current);
      });

      await agent.receive("Hello");
      await bus.waitForProcessing();

      // Should have gone through thinking -> responding -> idle
      expect(states).toContain("thinking");
      expect(states).toContain("responding");
      expect(states).toContain("idle");
    });
  });

  describe("event handlers", () => {
    describe("on(handler)", () => {
      it("should subscribe to all events", async () => {
        const agent = createAgent(options);
        const events: AgentOutput[] = [];

        agent.on((event) => events.push(event));

        await agent.receive("Hello");
        await bus.waitForProcessing();

        expect(events.length).toBeGreaterThan(0);
      });

      it("should return unsubscribe function", async () => {
        const agent = createAgent(options);
        const events: AgentOutput[] = [];

        const unsubscribe = agent.on((event) => events.push(event));
        unsubscribe();

        await agent.receive("Hello");
        await bus.waitForProcessing();

        expect(events).toHaveLength(0);
      });
    });

    describe("on(type, handler)", () => {
      it("should subscribe to specific event type", async () => {
        const agent = createAgent(options);
        const textDeltas: AgentOutput[] = [];

        agent.on("text_delta", (event) => textDeltas.push(event));

        await agent.receive("Hello");
        await bus.waitForProcessing();

        expect(textDeltas.length).toBeGreaterThan(0);
        expect(textDeltas.every((e) => e.type === "text_delta")).toBe(true);
      });
    });

    describe("on(types[], handler)", () => {
      it("should subscribe to multiple event types", async () => {
        const agent = createAgent(options);
        const events: AgentOutput[] = [];

        agent.on(["message_start", "message_stop"], (event) => events.push(event));

        await agent.receive("Hello");
        await bus.waitForProcessing();

        const types = events.map((e) => e.type);
        expect(types).toContain("message_start");
        expect(types).toContain("message_stop");
        expect(types.every((t) => t === "message_start" || t === "message_stop")).toBe(true);
      });
    });

    describe("on(handlers: EventHandlerMap)", () => {
      it("should subscribe using handler map", async () => {
        const agent = createAgent(options);
        const starts: AgentOutput[] = [];
        const stops: AgentOutput[] = [];

        agent.on({
          message_start: (e) => starts.push(e),
          message_stop: (e) => stops.push(e),
        });

        await agent.receive("Hello");
        await bus.waitForProcessing();

        expect(starts).toHaveLength(1);
        expect(stops).toHaveLength(1);
      });
    });
  });

  describe("react", () => {
    it("should subscribe using camelCase handlers", async () => {
      const agent = createAgent(options);
      const textDeltas: AgentOutput[] = [];
      const assistantMessages: AgentOutput[] = [];

      agent.react({
        onTextDelta: (e) => textDeltas.push(e),
        onAssistantMessage: (e) => assistantMessages.push(e),
      });

      await agent.receive("Hello");
      await bus.waitForProcessing();

      expect(textDeltas.length).toBeGreaterThan(0);
      expect(assistantMessages.length).toBeGreaterThan(0);
    });
  });

  describe("onStateChange", () => {
    it("should notify on state changes", async () => {
      const agent = createAgent(options);
      const changes: Array<{ prev: string; current: string }> = [];

      agent.onStateChange((change) => changes.push(change));

      await agent.receive("Hello");
      await bus.waitForProcessing();

      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0].prev).toBe("idle");
    });
  });

  describe("onReady", () => {
    it("should call handler immediately", () => {
      const agent = createAgent(options);
      let called = false;

      agent.onReady(() => {
        called = true;
      });

      expect(called).toBe(true);
    });

    it("should return unsubscribe function", () => {
      const agent = createAgent(options);
      let callCount = 0;

      const unsubscribe = agent.onReady(() => {
        callCount++;
      });

      expect(callCount).toBe(1);
      unsubscribe();
      // No additional calls after unsubscribe
    });
  });

  describe("onDestroy", () => {
    it("should call handler on destroy", async () => {
      const agent = createAgent(options);
      let called = false;

      agent.onDestroy(() => {
        called = true;
      });

      await agent.destroy();

      expect(called).toBe(true);
    });
  });

  describe("middleware", () => {
    it("should pass message through middleware", async () => {
      const agent = createAgent(options);
      const middlewareMessages: UserMessage[] = [];

      agent.use(async (message, next) => {
        middlewareMessages.push(message);
        await next(message);
      });

      await agent.receive("Hello");

      expect(middlewareMessages).toHaveLength(1);
      expect(middlewareMessages[0].content).toBe("Hello");
    });

    it("should allow middleware to modify message", async () => {
      // Capture user_message content from EventBus
      let receivedContent: string | undefined;

      const mockBus = new MockEventBus(createSimpleMessageFlow("Response"));
      mockBus.on("user_message", (event) => {
        const e = event as { data?: { content?: string } };
        receivedContent = e.data?.content;
      });

      const agent = createAgent({ bus: mockBus });

      agent.use(async (message, next) => {
        const modified: UserMessage = {
          ...message,
          content: message.content + " MODIFIED",
        };
        await next(modified);
      });

      await agent.receive("Hello");

      expect(receivedContent).toBe("Hello MODIFIED");
    });

    it("should allow middleware to block message", async () => {
      const agent = createAgent(options);

      agent.use(async (_message, _next) => {
        // Don't call next - block the message
      });

      await agent.receive("Hello");

      // No user_message should be emitted
      const userMessages = bus.getEvents("user_message");
      expect(userMessages).toHaveLength(0);
    });

    it("should chain multiple middlewares", async () => {
      const agent = createAgent(options);
      const order: number[] = [];

      agent.use(async (message, next) => {
        order.push(1);
        await next(message);
      });

      agent.use(async (message, next) => {
        order.push(2);
        await next(message);
      });

      await agent.receive("Hello");

      expect(order).toEqual([1, 2]);
    });

    it("should return unsubscribe function", async () => {
      const agent = createAgent(options);
      let middlewareCalled = false;

      const unsubscribe = agent.use(async (message, next) => {
        middlewareCalled = true;
        await next(message);
      });

      unsubscribe();

      await agent.receive("Hello");

      expect(middlewareCalled).toBe(false);
    });
  });

  describe("interceptor", () => {
    it("should intercept output events", async () => {
      const agent = createAgent(options);
      const interceptedEvents: AgentOutput[] = [];

      agent.intercept((event, next) => {
        interceptedEvents.push(event);
        next(event);
      });

      await agent.receive("Hello");
      await bus.waitForProcessing();

      expect(interceptedEvents.length).toBeGreaterThan(0);
    });

    it("should allow interceptor to modify events", async () => {
      const agent = createAgent(options);
      const outputs: AgentOutput[] = [];

      agent.on((e) => outputs.push(e));

      agent.intercept((event, next) => {
        const modified = { ...event, modified: true } as AgentOutput & { modified: boolean };
        next(modified);
      });

      await agent.receive("Hello");
      await bus.waitForProcessing();

      expect(outputs.every((e) => (e as unknown as { modified: boolean }).modified)).toBe(true);
    });

    it("should allow interceptor to filter events", async () => {
      const agent = createAgent(options);
      const outputs: AgentOutput[] = [];

      agent.on((e) => outputs.push(e));

      agent.intercept((event, next) => {
        // Only pass through text_delta events
        if (event.type === "text_delta") {
          next(event);
        }
      });

      await agent.receive("Hello");
      await bus.waitForProcessing();

      // Filtered to only text_delta events
      const textDeltas = outputs.filter((e) => e.type === "text_delta");
      expect(textDeltas.length).toBeGreaterThan(0);
    });

    it("should return unsubscribe function", async () => {
      const agent = createAgent(options);
      let interceptorCalled = false;

      const unsubscribe = agent.intercept((event, next) => {
        interceptorCalled = true;
        next(event);
      });

      unsubscribe();

      await agent.receive("Hello");
      await bus.waitForProcessing();

      expect(interceptorCalled).toBe(false);
    });
  });

  describe("interrupt", () => {
    it("should emit interrupt_request to EventBus when not idle", async () => {
      // Create a bus that doesn't auto-emit events
      const mockBus = new MockEventBus([]);
      const agent = createAgent({ bus: mockBus });

      // Manually trigger state change to non-idle by simulating stream start
      const messageStart = createStreamEvent("message_start", { messageId: "msg_1" });
      agent.handleStreamEvent(messageStart);

      // Agent should be in non-idle state now
      expect(agent.state).not.toBe("idle");

      // Now interrupt
      agent.interrupt();

      const interruptRequests = mockBus.getEvents("interrupt_request");
      expect(interruptRequests.length).toBe(1);
    });

    it("should not emit interrupt when idle", () => {
      const mockBus = new MockEventBus([]);
      const agent = createAgent({ bus: mockBus });

      // Agent is idle
      expect(agent.state).toBe("idle");

      agent.interrupt();

      const interruptRequests = mockBus.getEvents("interrupt_request");
      expect(interruptRequests.length).toBe(0);
    });
  });

  describe("destroy", () => {
    it("should clear handlers", async () => {
      const agent = createAgent(options);
      const events: AgentOutput[] = [];

      agent.on((e) => events.push(e));

      await agent.destroy();

      // After destroy, handlers should be cleared
      // Sending another message should not add to events
    });

    it("should call onDestroy handlers", async () => {
      const agent = createAgent(options);
      const destroyCalls: number[] = [];

      agent.onDestroy(() => destroyCalls.push(1));
      agent.onDestroy(() => destroyCalls.push(2));

      await agent.destroy();

      expect(destroyCalls).toEqual([1, 2]);
    });

    it("should clear message queue", async () => {
      const agent = createAgent(options);

      expect(agent.messageQueue.isEmpty).toBe(true);

      await agent.destroy();

      expect(agent.messageQueue.isEmpty).toBe(true);
    });

    it("should reject receive after destroy", async () => {
      const agent = createAgent(options);

      await agent.destroy();

      await expect(agent.receive("Hello")).rejects.toThrow("destroyed");
    });
  });

  describe("handleStreamEvent", () => {
    it("should process stream events directly", () => {
      const outputs: AgentOutput[] = [];
      const agent = createAgent(options);
      agent.on((e) => outputs.push(e));

      // Directly push stream events
      agent.handleStreamEvent(createStreamEvent("message_start", { messageId: "msg_1" }));
      agent.handleStreamEvent(createStreamEvent("text_delta", { text: "Hello" }));
      agent.handleStreamEvent(createStreamEvent("message_stop", { stopReason: "end_turn" }));

      const types = outputs.map((o) => o.type);
      expect(types).toContain("message_start");
      expect(types).toContain("text_delta");
      expect(types).toContain("message_stop");
    });
  });

  describe("error handling", () => {
    it("should handle handler errors gracefully", async () => {
      const agent = createAgent(options);

      agent.on(() => {
        throw new Error("Handler error");
      });

      // Should not throw
      await agent.receive("Hello");
      await bus.waitForProcessing();
    });
  });
});
