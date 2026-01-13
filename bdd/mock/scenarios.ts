/**
 * Mock Scenarios - Predefined event sequences for testing
 */

export interface MockEvent {
  type: string;
  delay?: number; // Milliseconds to wait before emitting
  data?: unknown;
}

export interface MockScenario {
  name: string;
  events: MockEvent[];
}

/**
 * Predefined mock scenarios for BDD tests
 */
export const SCENARIOS = new Map<string, MockScenario>([
  [
    "default",
    {
      name: "Simple text response",
      events: [
        { type: "message_start", delay: 10 },
        { type: "text_delta", data: { text: "Hello from mock!" }, delay: 10 },
        { type: "message_stop", delay: 10 },
      ],
    },
  ],

  [
    "multi-delta",
    {
      name: "Multiple text deltas",
      events: [
        { type: "message_start", delay: 10 },
        { type: "text_delta", data: { text: "Hello" }, delay: 5 },
        { type: "text_delta", data: { text: " " }, delay: 5 },
        { type: "text_delta", data: { text: "from" }, delay: 5 },
        { type: "text_delta", data: { text: " " }, delay: 5 },
        { type: "text_delta", data: { text: "mock!" }, delay: 5 },
        { type: "message_stop", delay: 10 },
      ],
    },
  ],

  [
    "with-thinking",
    {
      name: "Response with thinking",
      events: [
        { type: "message_start", delay: 10 },
        { type: "thinking_start", delay: 5 },
        { type: "text_delta", data: { text: "Let me analyze this..." }, delay: 10 },
        { type: "thinking_end", delay: 5 },
        { type: "text_delta", data: { text: "The answer is 42." }, delay: 10 },
        { type: "message_stop", delay: 10 },
      ],
    },
  ],

  [
    "with-tool",
    {
      name: "Tool use scenario",
      events: [
        { type: "message_start", delay: 10 },
        { type: "text_delta", data: { text: "Let me check that." }, delay: 10 },
        {
          type: "tool_call",
          data: {
            name: "bash",
            input: { command: "ls -la" },
          },
          delay: 20,
        },
        // Note: Tool result would come from external system, not from mock
        { type: "text_delta", data: { text: "I found the files." }, delay: 10 },
        { type: "message_stop", delay: 10 },
      ],
    },
  ],

  [
    "error",
    {
      name: "Error scenario",
      events: [
        { type: "message_start", delay: 10 },
        {
          type: "error",
          data: {
            message: "Rate limit exceeded",
            code: "rate_limit_error",
          },
          delay: 20,
        },
      ],
    },
  ],

  [
    "long-stream",
    {
      name: "100 text deltas for reliability testing",
      events: [
        { type: "message_start", delay: 10 },
        ...Array.from({ length: 100 }, (_, i) => ({
          type: "text_delta",
          data: { text: `chunk-${i} ` },
          delay: 5,
        })),
        { type: "message_stop", delay: 10 },
      ],
    },
  ],

  [
    "instant",
    {
      name: "Instant response (no delays)",
      events: [
        { type: "message_start" },
        { type: "text_delta", data: { text: "Instant response" } },
        { type: "message_stop" },
      ],
    },
  ],
]);
