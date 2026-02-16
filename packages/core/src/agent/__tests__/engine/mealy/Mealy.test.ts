/**
 * Mealy.test.ts - Unit tests for Mealy Machine runtime
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { createMealy, Mealy, type MealyConfig } from "../../../engine/mealy/Mealy";
import type { Processor } from "../../../engine/mealy/Processor";
import type { Sink, SinkDefinition } from "../../../engine/mealy/Sink";
import { MemoryStore } from "../../../engine/mealy/Store";

// Test types
interface TestState {
  count: number;
  buffer: string[];
}

interface TestEvent {
  type: string;
  value?: number;
  text?: string;
}

// Test processor
const testProcessor: Processor<TestState, TestEvent, TestEvent> = (state, event) => {
  switch (event.type) {
    case "increment":
      return [
        { ...state, count: state.count + (event.value || 1) },
        [{ type: "incremented", value: state.count + (event.value || 1) }],
      ];
    case "append":
      return [
        { ...state, buffer: [...state.buffer, event.text || ""] },
        [{ type: "appended", text: event.text }],
      ];
    case "reset":
      return [{ count: 0, buffer: [] }, [{ type: "reset_done" }]];
    case "multi_output":
      return [state, [{ type: "output_1" }, { type: "output_2" }, { type: "output_3" }]];
    default:
      return [state, []];
  }
};

const initialState: TestState = { count: 0, buffer: [] };

describe("Mealy", () => {
  let store: MemoryStore<TestState>;
  let config: MealyConfig<TestState, TestEvent>;
  let mealy: Mealy<TestState, TestEvent>;

  beforeEach(() => {
    store = new MemoryStore<TestState>();
    config = {
      processor: testProcessor,
      store,
      initialState: { ...initialState },
      recursive: false, // Disable recursion for basic tests
    };
    mealy = new Mealy(config);
  });

  describe("process", () => {
    it("should process event and return result", () => {
      const result = mealy.process("agent1", { type: "increment", value: 5 });

      expect(result.state.count).toBe(5);
      expect(result.outputs).toHaveLength(1);
      expect(result.outputs[0]).toEqual({ type: "incremented", value: 5 });
      expect(result.processCount).toBe(1);
    });

    it("should persist state between calls", () => {
      mealy.process("agent1", { type: "increment", value: 5 });
      const result = mealy.process("agent1", { type: "increment", value: 3 });

      expect(result.state.count).toBe(8);
    });

    it("should isolate state by agent ID", () => {
      mealy.process("agent1", { type: "increment", value: 10 });
      mealy.process("agent2", { type: "increment", value: 20 });

      expect(mealy.getState("agent1")?.count).toBe(10);
      expect(mealy.getState("agent2")?.count).toBe(20);
    });

    it("should use initial state for new agents", () => {
      const result = mealy.process("new_agent", { type: "increment", value: 1 });

      expect(result.state.count).toBe(1); // Started from 0
    });

    it("should handle events with no output", () => {
      const result = mealy.process("agent1", { type: "unknown" });

      expect(result.outputs).toHaveLength(0);
      expect(result.processCount).toBe(1);
    });

    it("should handle events with multiple outputs", () => {
      const result = mealy.process("agent1", { type: "multi_output" });

      expect(result.outputs).toHaveLength(3);
      expect(result.outputs[0]).toEqual({ type: "output_1" });
      expect(result.outputs[1]).toEqual({ type: "output_2" });
      expect(result.outputs[2]).toEqual({ type: "output_3" });
    });
  });

  describe("recursive processing", () => {
    it("should recursively process outputs when recursive=true", () => {
      // Processor that generates chain: A -> B -> C
      const chainProcessor: Processor<{ depth: number }, TestEvent, TestEvent> = (state, event) => {
        if (event.type === "start") {
          return [{ depth: 1 }, [{ type: "level_1" }]];
        }
        if (event.type === "level_1") {
          return [{ depth: 2 }, [{ type: "level_2" }]];
        }
        if (event.type === "level_2") {
          return [{ depth: 3 }, [{ type: "level_3" }]];
        }
        return [state, []];
      };

      const recursiveMealy = createMealy({
        processor: chainProcessor,
        store: new MemoryStore(),
        initialState: { depth: 0 },
        recursive: true,
      });

      const result = recursiveMealy.process("agent", { type: "start" });

      // Should have processed all 3 levels - outputs are accumulated
      expect(result.outputs).toContainEqual({ type: "level_1" });
      expect(result.outputs).toContainEqual({ type: "level_2" });
      expect(result.outputs).toContainEqual({ type: "level_3" });

      // Note: result.state is from the initial process call (depth=1)
      // but the store has been updated by recursive calls
      expect(result.state.depth).toBe(1); // First call's state
      expect(recursiveMealy.getState("agent")?.depth).toBe(3); // Final state in store
    });

    it("should respect maxDepth limit", () => {
      // Processor that generates infinite chain
      const infiniteProcessor: Processor<{ count: number }, TestEvent, TestEvent> = (
        state,
        event
      ) => {
        if (event.type.startsWith("level_")) {
          const next = state.count + 1;
          return [{ count: next }, [{ type: `level_${next}` }]];
        }
        return [state, []];
      };

      const limitedMealy = createMealy({
        processor: infiniteProcessor,
        store: new MemoryStore(),
        initialState: { count: 0 },
        recursive: true,
        maxDepth: 5,
      });

      const result = limitedMealy.process("agent", { type: "level_0" });

      // Should stop at maxDepth
      expect(result.state.count).toBeLessThanOrEqual(5);
    });
  });

  describe("sinks", () => {
    it("should send outputs to sink function", () => {
      const sinkOutputs: TestEvent[][] = [];
      const testSink: Sink<TestEvent> = (_id, outputs) => {
        sinkOutputs.push(outputs);
      };

      const mealyWithSink = createMealy({
        ...config,
        sinks: [testSink],
      });

      mealyWithSink.process("agent1", { type: "increment", value: 5 });

      expect(sinkOutputs).toHaveLength(1);
      expect(sinkOutputs[0]).toContainEqual({ type: "incremented", value: 5 });
    });

    it("should send outputs to named SinkDefinition", () => {
      const sinkOutputs: TestEvent[][] = [];
      const namedSink: SinkDefinition<TestEvent> = {
        name: "test-sink",
        sink: (_id, outputs) => {
          sinkOutputs.push(outputs);
        },
      };

      const mealyWithSink = createMealy({
        ...config,
        sinks: [namedSink],
      });

      mealyWithSink.process("agent1", { type: "increment", value: 5 });

      expect(sinkOutputs).toHaveLength(1);
    });

    it("should filter outputs with SinkDefinition.filter", () => {
      const sinkOutputs: TestEvent[][] = [];
      const filteredSink: SinkDefinition<TestEvent> = {
        name: "filtered-sink",
        filter: (event) => event.type === "appended",
        sink: (_id, outputs) => {
          sinkOutputs.push(outputs);
        },
      };

      const mealyWithSink = createMealy({
        ...config,
        sinks: [filteredSink],
      });

      // This should be filtered out
      mealyWithSink.process("agent1", { type: "increment", value: 5 });
      expect(sinkOutputs).toHaveLength(0);

      // This should pass through
      mealyWithSink.process("agent1", { type: "append", text: "hello" });
      expect(sinkOutputs).toHaveLength(1);
      expect(sinkOutputs[0]).toContainEqual({ type: "appended", text: "hello" });
    });

    it("should handle async sinks", async () => {
      const sinkOutputs: TestEvent[][] = [];
      const asyncSink: Sink<TestEvent> = async (_id, outputs) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        sinkOutputs.push(outputs);
      };

      const mealyWithSink = createMealy({
        ...config,
        sinks: [asyncSink],
      });

      mealyWithSink.process("agent1", { type: "increment", value: 5 });

      // Give async sink time to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(sinkOutputs).toHaveLength(1);
    });

    it("should catch and log sink errors", () => {
      const errorSink: Sink<TestEvent> = () => {
        throw new Error("Sink error");
      };

      const mealyWithSink = createMealy({
        ...config,
        sinks: [errorSink],
      });

      // Should not throw
      expect(() => {
        mealyWithSink.process("agent1", { type: "increment", value: 5 });
      }).not.toThrow();
    });
  });

  describe("state management", () => {
    it("should return state with getState", () => {
      mealy.process("agent1", { type: "increment", value: 5 });

      const state = mealy.getState("agent1");

      expect(state).toEqual({ count: 5, buffer: [] });
    });

    it("should return undefined for non-existent agent", () => {
      expect(mealy.getState("unknown")).toBeUndefined();
    });

    it("should check existence with hasState", () => {
      expect(mealy.hasState("agent1")).toBe(false);

      mealy.process("agent1", { type: "increment" });

      expect(mealy.hasState("agent1")).toBe(true);
    });

    it("should remove state with cleanup", () => {
      mealy.process("agent1", { type: "increment" });
      expect(mealy.hasState("agent1")).toBe(true);

      mealy.cleanup("agent1");

      expect(mealy.hasState("agent1")).toBe(false);
    });
  });

  describe("dynamic sink management", () => {
    it("should add sink at runtime", () => {
      const outputs: TestEvent[][] = [];
      const dynamicSink: Sink<TestEvent> = (_id, o) => outputs.push(o);

      mealy.process("agent1", { type: "increment" }); // No output yet
      expect(outputs).toHaveLength(0);

      mealy.addSink(dynamicSink);
      mealy.process("agent1", { type: "increment" });

      expect(outputs).toHaveLength(1);
    });

    it("should remove named sink", () => {
      const outputs: TestEvent[][] = [];
      const namedSink: SinkDefinition<TestEvent> = {
        name: "removable",
        sink: (_id, o) => outputs.push(o),
      };

      mealy.addSink(namedSink);
      mealy.process("agent1", { type: "increment" });
      expect(outputs).toHaveLength(1);

      const removed = mealy.removeSink("removable");
      expect(removed).toBe(true);

      mealy.process("agent1", { type: "increment" });
      expect(outputs).toHaveLength(1); // Still 1, no new output
    });

    it("should return false when removing non-existent sink", () => {
      const removed = mealy.removeSink("non-existent");
      expect(removed).toBe(false);
    });
  });
});

describe("createMealy", () => {
  it("should create Mealy instance with factory function", () => {
    const mealy = createMealy({
      processor: testProcessor,
      store: new MemoryStore(),
      initialState,
    });

    expect(mealy).toBeInstanceOf(Mealy);

    const result = mealy.process("test", { type: "increment", value: 1 });
    expect(result.state.count).toBe(1);
  });

  it("should use default values for optional config", () => {
    const mealy = createMealy({
      processor: testProcessor,
      store: new MemoryStore(),
      initialState,
    });

    // Default recursive = true, maxDepth = 100
    // Just verify it works
    const result = mealy.process("test", { type: "increment" });
    expect(result.processCount).toBeGreaterThanOrEqual(1);
  });
});
