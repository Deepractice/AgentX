/**
 * EventBus.test.ts - Unit tests for EventBus implementation
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { EventBusImpl as EventBus } from "../EventBus";
import type { BusEvent } from "../types";

// Test event factory
function createEvent(type: string, data: unknown = {}): BusEvent {
  return {
    type,
    timestamp: Date.now(),
    data,
    source: "agent",
    category: "message",
    intent: "notification",
  };
}

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe("emit and on", () => {
    it("should emit event to subscriber", () => {
      const received: BusEvent[] = [];
      bus.on("test_event", (e) => received.push(e));

      bus.emit(createEvent("test_event", { value: 1 }));

      expect(received).toHaveLength(1);
      expect(received[0].type).toBe("test_event");
      expect(received[0].data).toEqual({ value: 1 });
    });

    it("should not receive events of different type", () => {
      const received: BusEvent[] = [];
      bus.on("type_a", (e) => received.push(e));

      bus.emit(createEvent("type_b"));

      expect(received).toHaveLength(0);
    });

    it("should support multiple subscribers", () => {
      let count = 0;
      bus.on("test", () => count++);
      bus.on("test", () => count++);

      bus.emit(createEvent("test"));

      expect(count).toBe(2);
    });

    it("should support array of event types", () => {
      const received: string[] = [];
      bus.on(["type_a", "type_b"], (e) => received.push(e.type));

      bus.emit(createEvent("type_a"));
      bus.emit(createEvent("type_b"));
      bus.emit(createEvent("type_c"));

      expect(received).toEqual(["type_a", "type_b"]);
    });
  });

  describe("unsubscribe", () => {
    it("should stop receiving events after unsubscribe", () => {
      const received: BusEvent[] = [];
      const unsubscribe = bus.on("test", (e) => received.push(e));

      bus.emit(createEvent("test"));
      expect(received).toHaveLength(1);

      unsubscribe();

      bus.emit(createEvent("test"));
      expect(received).toHaveLength(1);
    });
  });

  describe("onAny", () => {
    it("should receive all events", () => {
      const received: string[] = [];
      bus.onAny((e) => received.push(e.type));

      bus.emit(createEvent("type_a"));
      bus.emit(createEvent("type_b"));
      bus.emit(createEvent("type_c"));

      expect(received).toEqual(["type_a", "type_b", "type_c"]);
    });
  });

  describe("once", () => {
    it("should only receive first event", () => {
      let count = 0;
      bus.once("test", () => count++);

      bus.emit(createEvent("test"));
      bus.emit(createEvent("test"));
      bus.emit(createEvent("test"));

      expect(count).toBe(1);
    });
  });

  describe("filter option", () => {
    it("should filter events", () => {
      const received: BusEvent[] = [];
      bus.on("test", (e) => received.push(e), {
        filter: (e) => (e.data as { value: number }).value > 5,
      });

      bus.emit(createEvent("test", { value: 3 }));
      bus.emit(createEvent("test", { value: 7 }));
      bus.emit(createEvent("test", { value: 10 }));

      expect(received).toHaveLength(2);
      expect((received[0].data as { value: number }).value).toBe(7);
      expect((received[1].data as { value: number }).value).toBe(10);
    });
  });

  describe("priority option", () => {
    it("should execute higher priority handlers first", () => {
      const order: number[] = [];

      bus.on("test", () => order.push(1), { priority: 1 });
      bus.on("test", () => order.push(10), { priority: 10 });
      bus.on("test", () => order.push(5), { priority: 5 });

      bus.emit(createEvent("test"));

      expect(order).toEqual([10, 5, 1]);
    });
  });

  describe("emitBatch", () => {
    it("should emit multiple events", () => {
      const received: string[] = [];
      bus.onAny((e) => received.push(e.type));

      bus.emitBatch([createEvent("a"), createEvent("b"), createEvent("c")]);

      expect(received).toEqual(["a", "b", "c"]);
    });
  });

  describe("asProducer and asConsumer", () => {
    it("should return producer view with only emit methods", () => {
      const producer = bus.asProducer();

      expect(typeof producer.emit).toBe("function");
      expect(typeof producer.emitBatch).toBe("function");
      expect(typeof producer.emitCommand).toBe("function");
      expect((producer as unknown as { on?: unknown }).on).toBeUndefined();
    });

    it("should return consumer view with only subscribe methods", () => {
      const consumer = bus.asConsumer();

      expect(typeof consumer.on).toBe("function");
      expect(typeof consumer.onAny).toBe("function");
      expect(typeof consumer.once).toBe("function");
      expect(typeof consumer.onCommand).toBe("function");
      expect(typeof consumer.request).toBe("function");
      expect((consumer as unknown as { emit?: unknown }).emit).toBeUndefined();
    });

    it("should cache views", () => {
      const producer1 = bus.asProducer();
      const producer2 = bus.asProducer();
      expect(producer1).toBe(producer2);

      const consumer1 = bus.asConsumer();
      const consumer2 = bus.asConsumer();
      expect(consumer1).toBe(consumer2);
    });

    it("producer emit should work", () => {
      const received: BusEvent[] = [];
      bus.on("test", (e) => received.push(e));

      const producer = bus.asProducer();
      producer.emit(createEvent("test"));

      expect(received).toHaveLength(1);
    });

    it("consumer on should work", () => {
      const received: BusEvent[] = [];
      const consumer = bus.asConsumer();
      consumer.on("test", (e) => received.push(e));

      bus.emit(createEvent("test"));

      expect(received).toHaveLength(1);
    });
  });

  describe("destroy", () => {
    it("should stop emitting after destroy", () => {
      const received: BusEvent[] = [];
      bus.on("test", (e) => received.push(e));

      bus.destroy();
      bus.emit(createEvent("test"));

      expect(received).toHaveLength(0);
    });

    it("should return no-op unsubscribe after destroy", () => {
      bus.destroy();
      const unsubscribe = bus.on("test", () => {});

      // Should not throw
      expect(() => unsubscribe()).not.toThrow();
    });

    it("should be idempotent", () => {
      expect(() => {
        bus.destroy();
        bus.destroy();
        bus.destroy();
      }).not.toThrow();
    });
  });

  describe("error handling", () => {
    it("should not stop other handlers on error", () => {
      const received: number[] = [];

      bus.on("test", () => received.push(1));
      bus.on("test", () => {
        throw new Error("Handler error");
      });
      bus.on("test", () => received.push(3));

      // Should not throw
      expect(() => bus.emit(createEvent("test"))).not.toThrow();

      // Other handlers should still run
      expect(received).toEqual([1, 3]);
    });
  });
});
