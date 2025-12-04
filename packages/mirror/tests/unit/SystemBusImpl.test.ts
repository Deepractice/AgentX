import { describe, it, expect, vi, beforeEach } from "vitest";
import { SystemBusImpl } from "../../src/SystemBusImpl";

describe("SystemBusImpl", () => {
  let bus: SystemBusImpl;

  beforeEach(() => {
    bus = new SystemBusImpl();
  });

  describe("emit", () => {
    it("should emit event to subscribers", () => {
      const handler = vi.fn();
      bus.on("test_event", handler);

      bus.emit({ type: "test_event", data: { value: 1 } });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ type: "test_event", data: { value: 1 } });
    });

    it("should not emit to destroyed bus", () => {
      const handler = vi.fn();
      bus.on("test_event", handler);
      bus.destroy();

      bus.emit({ type: "test_event", data: {} });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("on", () => {
    it("should subscribe to single event type", () => {
      const handler = vi.fn();
      bus.on("event_a", handler);

      bus.emit({ type: "event_a", data: {} });
      bus.emit({ type: "event_b", data: {} });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should subscribe to multiple event types", () => {
      const handler = vi.fn();
      bus.on(["event_a", "event_b"], handler);

      bus.emit({ type: "event_a", data: {} });
      bus.emit({ type: "event_b", data: {} });
      bus.emit({ type: "event_c", data: {} });

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it("should return unsubscribe function", () => {
      const handler = vi.fn();
      const unsubscribe = bus.on("test_event", handler);

      bus.emit({ type: "test_event", data: {} });
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      bus.emit({ type: "test_event", data: {} });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should support filter option", () => {
      const handler = vi.fn();
      bus.on("test_event", handler, {
        filter: (event) => (event.data as any).value > 5,
      });

      bus.emit({ type: "test_event", data: { value: 3 } });
      bus.emit({ type: "test_event", data: { value: 10 } });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ type: "test_event", data: { value: 10 } });
    });

    it("should support priority option", () => {
      const order: number[] = [];

      bus.on("test_event", () => order.push(1), { priority: 1 });
      bus.on("test_event", () => order.push(2), { priority: 10 });
      bus.on("test_event", () => order.push(3), { priority: 5 });

      bus.emit({ type: "test_event", data: {} });

      expect(order).toEqual([2, 3, 1]);
    });
  });

  describe("onAny", () => {
    it("should subscribe to all event types", () => {
      const handler = vi.fn();
      bus.onAny(handler);

      bus.emit({ type: "event_a", data: {} });
      bus.emit({ type: "event_b", data: {} });
      bus.emit({ type: "event_c", data: {} });

      expect(handler).toHaveBeenCalledTimes(3);
    });
  });

  describe("once", () => {
    it("should only trigger once", () => {
      const handler = vi.fn();
      bus.once("test_event", handler);

      bus.emit({ type: "test_event", data: {} });
      bus.emit({ type: "test_event", data: {} });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("emitBatch", () => {
    it("should emit multiple events", () => {
      const handler = vi.fn();
      bus.onAny(handler);

      bus.emitBatch([
        { type: "event_a", data: {} },
        { type: "event_b", data: {} },
      ]);

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe("destroy", () => {
    it("should clear all subscriptions", () => {
      const handler = vi.fn();
      bus.on("test_event", handler);
      bus.destroy();

      // After destroy, new subscriptions return no-op
      const unsubscribe = bus.on("test_event", handler);
      expect(unsubscribe).toBeDefined();

      bus.emit({ type: "test_event", data: {} });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should catch handler errors and continue", () => {
      const errorHandler = vi.fn(() => {
        throw new Error("Handler error");
      });
      const normalHandler = vi.fn();

      bus.on("test_event", errorHandler, { priority: 10 });
      bus.on("test_event", normalHandler, { priority: 1 });

      bus.emit({ type: "test_event", data: {} });

      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
    });
  });
});
