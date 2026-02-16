/**
 * combinators.test.ts - Unit tests for Mealy processor combinators
 */

import { describe, expect, it } from "bun:test";
import {
  chainProcessors,
  combineInitialStates,
  combineProcessors,
  filterProcessor,
  identityProcessor,
  mapOutput,
  withLogging,
} from "../../../engine/mealy/combinators";
import type { Processor } from "../../../engine/mealy/Processor";

// Test event types
interface TestEvent {
  type: string;
  value: number;
}

// Test state types
interface CounterState {
  count: number;
}

interface AccumulatorState {
  total: number;
}

// Test processors
const counterProcessor: Processor<CounterState, TestEvent, TestEvent> = (state, event) => {
  if (event.type === "increment") {
    return [
      { count: state.count + event.value },
      [{ type: "counted", value: state.count + event.value }],
    ];
  }
  return [state, []];
};

const accumulatorProcessor: Processor<AccumulatorState, TestEvent, TestEvent> = (state, event) => {
  if (event.type === "accumulate") {
    const newTotal = state.total + event.value;
    return [{ total: newTotal }, [{ type: "accumulated", value: newTotal }]];
  }
  return [state, []];
};

describe("combineProcessors", () => {
  interface CombinedState {
    counter: CounterState;
    accumulator: AccumulatorState;
  }

  const combinedProcessor = combineProcessors<CombinedState, TestEvent, TestEvent>({
    counter: counterProcessor,
    accumulator: accumulatorProcessor,
  });

  it("should process event through all sub-processors", () => {
    const state: CombinedState = {
      counter: { count: 0 },
      accumulator: { total: 0 },
    };

    // Event handled by counter
    const [newState1, outputs1] = combinedProcessor(state, { type: "increment", value: 5 });
    expect(newState1.counter.count).toBe(5);
    expect(newState1.accumulator.total).toBe(0);
    expect(outputs1).toHaveLength(1);
    expect(outputs1[0]).toEqual({ type: "counted", value: 5 });

    // Event handled by accumulator
    const [newState2, outputs2] = combinedProcessor(newState1, { type: "accumulate", value: 10 });
    expect(newState2.counter.count).toBe(5);
    expect(newState2.accumulator.total).toBe(10);
    expect(outputs2).toHaveLength(1);
    expect(outputs2[0]).toEqual({ type: "accumulated", value: 10 });
  });

  it("should merge outputs from all processors", () => {
    // Create processors that both respond to the same event type
    const proc1: Processor<{ a: number }, TestEvent, TestEvent> = (state, event) => {
      if (event.type === "both") {
        return [{ a: state.a + 1 }, [{ type: "from_a", value: 1 }]];
      }
      return [state, []];
    };

    const proc2: Processor<{ b: number }, TestEvent, TestEvent> = (state, event) => {
      if (event.type === "both") {
        return [{ b: state.b + 2 }, [{ type: "from_b", value: 2 }]];
      }
      return [state, []];
    };

    const combined = combineProcessors<
      { a: { a: number }; b: { b: number } },
      TestEvent,
      TestEvent
    >({
      a: proc1,
      b: proc2,
    });

    const [newState, outputs] = combined({ a: { a: 0 }, b: { b: 0 } }, { type: "both", value: 0 });

    expect(newState.a.a).toBe(1);
    expect(newState.b.b).toBe(2);
    expect(outputs).toHaveLength(2);
    expect(outputs).toContainEqual({ type: "from_a", value: 1 });
    expect(outputs).toContainEqual({ type: "from_b", value: 2 });
  });

  it("should return unchanged state when no processor handles event", () => {
    const state: CombinedState = {
      counter: { count: 5 },
      accumulator: { total: 10 },
    };

    const [newState, outputs] = combinedProcessor(state, { type: "unknown", value: 100 });

    expect(newState.counter.count).toBe(5);
    expect(newState.accumulator.total).toBe(10);
    expect(outputs).toHaveLength(0);
  });
});

describe("combineInitialStates", () => {
  it("should create initial state from multiple factories", () => {
    const createInitialState = combineInitialStates({
      counter: () => ({ count: 0 }),
      accumulator: () => ({ total: 100 }),
    });

    const state = createInitialState();

    expect(state.counter.count).toBe(0);
    expect(state.accumulator.total).toBe(100);
  });

  it("should create fresh state on each call", () => {
    const createInitialState = combineInitialStates({
      counter: () => ({ count: 0 }),
    });

    const state1 = createInitialState();
    const state2 = createInitialState();

    state1.counter.count = 999;

    expect(state2.counter.count).toBe(0);
  });
});

describe("chainProcessors", () => {
  // Processors that pass through and accumulate
  const addOneProcessor: Processor<CounterState, TestEvent, TestEvent> = (state, event) => {
    const newCount = state.count + 1;
    return [{ count: newCount }, [{ ...event, value: event.value + 1 }]];
  };

  const multiplyTwoProcessor: Processor<CounterState, TestEvent, TestEvent> = (state, event) => {
    const newCount = state.count * 2;
    return [{ count: newCount }, [{ ...event, value: event.value * 2 }]];
  };

  it("should chain processors sequentially", () => {
    const chained = chainProcessors(addOneProcessor, multiplyTwoProcessor);

    const [newState, outputs] = chained({ count: 1 }, { type: "test", value: 10 });

    // State: (1 + 1) * 2 = 4
    expect(newState.count).toBe(4);

    // Outputs from both processors
    expect(outputs).toHaveLength(2);
    expect(outputs[0]).toEqual({ type: "test", value: 11 }); // 10 + 1
    expect(outputs[1]).toEqual({ type: "test", value: 20 }); // 10 * 2
  });

  it("should handle empty processor chain", () => {
    const chained = chainProcessors<CounterState, TestEvent>();

    const [newState, outputs] = chained({ count: 5 }, { type: "test", value: 10 });

    expect(newState.count).toBe(5);
    expect(outputs).toHaveLength(0);
  });

  it("should handle single processor", () => {
    const chained = chainProcessors(addOneProcessor);

    const [newState, outputs] = chained({ count: 1 }, { type: "test", value: 10 });

    expect(newState.count).toBe(2);
    expect(outputs).toHaveLength(1);
    expect(outputs[0]).toEqual({ type: "test", value: 11 });
  });
});

describe("filterProcessor", () => {
  const incrementOnlyProcessor = filterProcessor<CounterState, TestEvent, TestEvent>(
    (event) => event.type === "increment",
    counterProcessor
  );

  it("should process events matching the predicate", () => {
    const [newState, outputs] = incrementOnlyProcessor(
      { count: 0 },
      { type: "increment", value: 5 }
    );

    expect(newState.count).toBe(5);
    expect(outputs).toHaveLength(1);
  });

  it("should skip events not matching the predicate", () => {
    const [newState, outputs] = incrementOnlyProcessor(
      { count: 10 },
      { type: "decrement", value: 5 }
    );

    expect(newState.count).toBe(10);
    expect(outputs).toHaveLength(0);
  });
});

describe("mapOutput", () => {
  interface EnrichedEvent extends TestEvent {
    timestamp: number;
  }

  it("should transform output events", () => {
    const withTimestamp = mapOutput<CounterState, TestEvent, TestEvent, EnrichedEvent>(
      counterProcessor,
      (output) => ({ ...output, timestamp: 12345 })
    );

    const [newState, outputs] = withTimestamp({ count: 0 }, { type: "increment", value: 5 });

    expect(newState.count).toBe(5);
    expect(outputs).toHaveLength(1);
    expect(outputs[0]).toEqual({ type: "counted", value: 5, timestamp: 12345 });
  });

  it("should handle empty outputs", () => {
    const withTimestamp = mapOutput<CounterState, TestEvent, TestEvent, EnrichedEvent>(
      counterProcessor,
      (output) => ({ ...output, timestamp: 12345 })
    );

    const [newState, outputs] = withTimestamp({ count: 0 }, { type: "unknown", value: 0 });

    expect(newState.count).toBe(0);
    expect(outputs).toHaveLength(0);
  });
});

describe("withLogging", () => {
  it("should call logger with input and output", () => {
    const logs: unknown[] = [];
    const mockLogger = {
      debug: (message: string, data?: unknown) => {
        logs.push({ message, data });
      },
    };

    const loggingProcessor = withLogging(counterProcessor, "Counter", mockLogger);

    const [newState, outputs] = loggingProcessor({ count: 0 }, { type: "increment", value: 5 });

    expect(newState.count).toBe(5);
    expect(outputs).toHaveLength(1);

    // Should have 2 log entries: input and output
    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({ message: "[Counter] Input:" });
    expect(logs[1]).toMatchObject({ message: "[Counter] Output:" });
  });

  it("should preserve processor behavior", () => {
    const logs: unknown[] = [];
    const mockLogger = {
      debug: (_msg: string, _data?: unknown) => {
        logs.push({});
      },
    };

    const loggingProcessor = withLogging(counterProcessor, "Counter", mockLogger);

    // Test multiple calls
    let [state, outputs] = loggingProcessor({ count: 0 }, { type: "increment", value: 1 });
    expect(state.count).toBe(1);

    [state, outputs] = loggingProcessor(state, { type: "increment", value: 2 });
    expect(state.count).toBe(3);
    expect(outputs[0]).toEqual({ type: "counted", value: 3 });
  });
});

describe("identityProcessor", () => {
  it("should return unchanged state and empty outputs", () => {
    const identity = identityProcessor<CounterState, TestEvent>();

    const [newState, outputs] = identity({ count: 42 }, { type: "any", value: 100 });

    expect(newState.count).toBe(42);
    expect(outputs).toHaveLength(0);
  });

  it("should work with any event type", () => {
    const identity = identityProcessor<{ data: string }, { anything: boolean }>();

    const [newState, outputs] = identity({ data: "test" }, { anything: true });

    expect(newState.data).toBe("test");
    expect(outputs).toHaveLength(0);
  });
});
