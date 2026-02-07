/**
 * Message Contract steps
 *
 * Verifies the converter contract between Core message types and Vercel AI SDK.
 * Tests toVercelMessage() / toVercelMessages() with real message structures.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ModelMessage } from "ai";
import { modelMessageSchema } from "ai";
import type {
  Message,
  ToolResultMessage,
  AssistantMessage,
  ToolResultOutput,
  MessageAssemblerState,
} from "@agentxjs/core/agent";
import {
  messageAssemblerProcessor,
  createInitialMessageAssemblerState,
} from "@agentxjs/core/agent";
import { toVercelMessage, toVercelMessages, createEvent, toStopReason } from "@agentxjs/mono-driver";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

// ============================================================================
// State
// ============================================================================

let currentMessage: Message;
let toolResultMsg: ToolResultMessage;
let assistantMsg: AssistantMessage;
let convertedResult: ModelMessage | null;
let convertedResults: ModelMessage[];

// ============================================================================
// 09 - Message Format Contract
// ============================================================================

// --- Scenario 1: ToolResultMessage converts to Vercel ToolModelMessage ---

Given("the core defines ToolResultMessage as:", function (_table: any) {
  // Construct a realistic ToolResultMessage for testing
  toolResultMsg = {
    id: "msg-tr-001",
    role: "tool",
    subtype: "tool-result",
    toolCallId: "call-abc-123",
    toolResult: {
      type: "tool-result",
      id: "call-abc-123",
      name: "bash_tool",
      output: { type: "text", value: "total 64\ndrwxr-xr-x 12 user staff 384 Jan 1 00:00 ." },
    },
    timestamp: Date.now(),
  };
  currentMessage = toolResultMsg;
});

Given("ToolResultPart.output is a ToolResultOutput union:", function (_table: any) {
  // The table documents the union variants — verified in Then step
});

When("the driver converts it to Vercel AI SDK format", function () {
  convertedResult = toVercelMessage(currentMessage);
});

Then("the Vercel ToolModelMessage must have:", function (table: any) {
  assert.ok(convertedResult, "toVercelMessage returned null for ToolResultMessage");

  const msg = convertedResult as any;
  assert.strictEqual(msg.role, "tool", "Expected role 'tool'");
  assert.ok(Array.isArray(msg.content), "Expected content to be an array");
  assert.strictEqual(msg.content.length, 1, "Expected exactly one content part");

  const part = msg.content[0];
  const rows = table.hashes();
  for (const row of rows) {
    const field = row.field as string;
    const mappedFrom = row["mapped from"] as string;

    // Resolve expected value from the source message
    const expected = resolvePath(toolResultMsg, mappedFrom);
    // Resolve actual value from converted result
    const actual = resolvePath(convertedResult, field);

    assert.deepStrictEqual(
      actual,
      expected,
      `Field "${field}" mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
});

Then("the output must preserve the ToolResultOutput discriminated union", function () {
  // Test each variant of ToolResultOutput is preserved through conversion
  const variants: Array<{ label: string; output: ToolResultOutput }> = [
    { label: "text", output: { type: "text", value: "hello world" } },
    { label: "json", output: { type: "json", value: { count: 42 } } },
    { label: "error-text", output: { type: "error-text", value: "command not found" } },
    { label: "error-json", output: { type: "error-json", value: { code: 127 } } },
    { label: "execution-denied", output: { type: "execution-denied", reason: "user cancelled" } },
  ];

  for (const { label, output } of variants) {
    const msg: ToolResultMessage = {
      id: `msg-${label}`,
      role: "tool",
      subtype: "tool-result",
      toolCallId: `call-${label}`,
      toolResult: {
        type: "tool-result",
        id: `call-${label}`,
        name: "test_tool",
        output,
      },
      timestamp: Date.now(),
    };

    const result = toVercelMessage(msg) as any;
    assert.ok(result, `toVercelMessage returned null for ${label} variant`);
    assert.deepStrictEqual(
      result.content[0].output,
      output,
      `ToolResultOutput "${label}" variant was not preserved through conversion.\n` +
        `  Expected: ${JSON.stringify(output)}\n` +
        `  Got:      ${JSON.stringify(result.content[0].output)}`
    );
  }
});

// --- Scenario 2: AssistantMessage with tool calls converts correctly ---

Given(
  "the core defines AssistantMessage.content as array containing ToolCallPart:",
  function (_table: any) {
    assistantMsg = {
      id: "msg-asst-001",
      role: "assistant",
      subtype: "assistant",
      content: [
        { type: "text", text: "Let me check that for you." },
        {
          type: "tool-call",
          id: "call-xyz-789",
          name: "bash_tool",
          input: { command: "ls -la" },
        },
      ],
      timestamp: Date.now(),
    };
    currentMessage = assistantMsg;
  }
);

Then("each ToolCallPart must map to:", function (table: any) {
  assert.ok(convertedResult, "toVercelMessage returned null for AssistantMessage");

  const msg = convertedResult as any;
  assert.strictEqual(msg.role, "assistant", "Expected role 'assistant'");
  assert.ok(Array.isArray(msg.content), "Expected content to be an array");

  // Find the tool-call part in converted content
  const toolCallParts = msg.content.filter((p: any) => p.type === "tool-call");
  assert.ok(toolCallParts.length > 0, "No tool-call parts found in converted message");

  const sourceToolCall = (assistantMsg.content as any[]).find(
    (p) => p.type === "tool-call"
  );
  const converted = toolCallParts[0];

  const rows = table.hashes();
  for (const row of rows) {
    const vercelField = row["vercel field"] as string;
    const mappedFrom = row["mapped from"] as string;

    const expected = resolveDotPath(sourceToolCall, mappedFrom.replace("part.", ""));
    const actual = resolveDotPath(converted, vercelField);

    assert.deepStrictEqual(
      actual,
      expected,
      `ToolCall field "${vercelField}" mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
});

// --- Scenario 3: Converters use Core types, not ad-hoc casts ---

Given("a converter function in the driver layer", function () {
  // Read the converter source file for static analysis
});

Then("it must import and use Core message types directly:", function (table: any) {
  const converterPath = resolve(ROOT, "packages/mono-driver/src/converters.ts");
  const source = readFileSync(converterPath, "utf-8");

  const rows = table.hashes();
  for (const row of rows) {
    const forbidden = row["don't"] as string;

    // Check that the "don't" pattern is NOT in the source
    if (forbidden && source.includes(forbidden)) {
      assert.fail(
        `converters.ts contains forbidden pattern: "${forbidden}"\n` +
          `  Should use: "${row["do"]}"`
      );
    }
  }
});

Then("type-safe access prevents silent undefined bugs", function () {
  // Verify by attempting conversion with a real ToolResultMessage
  // If field paths were wrong, output would be undefined
  const msg: ToolResultMessage = {
    id: "msg-safety",
    role: "tool",
    subtype: "tool-result",
    toolCallId: "call-safety",
    toolResult: {
      type: "tool-result",
      id: "call-safety",
      name: "safety_check",
      output: { type: "text", value: "safe" },
    },
    timestamp: Date.now(),
  };

  const result = toVercelMessage(msg) as any;
  assert.ok(result, "Conversion returned null");

  const part = result.content[0];
  assert.ok(part.toolCallId !== undefined, "toolCallId is undefined — field path is wrong");
  assert.ok(part.toolName !== undefined, "toolName is undefined — field path is wrong");
  assert.ok(part.output !== undefined, "output is undefined — field path is wrong");
  assert.notStrictEqual(part.toolName, "unknown", "toolName should not be hardcoded 'unknown'");
  assert.strictEqual(part.toolName, "safety_check", "toolName should come from toolResult.name");
});

// --- Scenario 4: Tool result round-trips through session storage ---

Given("a tool executes and returns a result", function () {
  // The messageAssemblerProcessor creates ToolResultMessage — tested via converter
});

When("the engine creates a ToolResultMessage via messageAssemblerProcessor", function () {
  // Simulate what messageAssemblerProcessor produces (line 372-379 in core)
  toolResultMsg = {
    id: "msg-roundtrip",
    role: "tool",
    subtype: "tool-result",
    toolCallId: "call-roundtrip-001",
    toolResult: {
      type: "tool-result",
      id: "call-roundtrip-001",
      name: "file_reader",
      output: {
        type: "text",
        value: '{"status":"ok","lines":42}',
      },
    },
    timestamp: Date.now(),
  };
});

Then("the message is stored in the session repository", function () {
  // Simulate serialization round-trip (JSON serialize/deserialize like SQLite would)
  const serialized = JSON.stringify(toolResultMsg);
  toolResultMsg = JSON.parse(serialized) as ToolResultMessage;
});

Then("when the driver loads history for the next LLM call", function () {
  // toVercelMessages handles the full array
  convertedResults = toVercelMessages([toolResultMsg]);
});

Then("toVercelMessages\\() converts each stored message", function () {
  assert.strictEqual(convertedResults.length, 1, "Expected 1 converted message");
});

Then("the ToolResultOutput arrives at the AI SDK intact", function () {
  const result = convertedResults[0] as any;
  assert.strictEqual(result.role, "tool");

  const part = result.content[0];
  assert.strictEqual(part.type, "tool-result");
  assert.strictEqual(part.toolCallId, "call-roundtrip-001");
  assert.strictEqual(part.toolName, "file_reader");
  assert.deepStrictEqual(part.output, {
    type: "text",
    value: '{"status":"ok","lines":42}',
  });
});

// --- Scenario 5: Multi-step tool execution preserves correct message ordering ---

import type { DriverStreamEvent } from "@agentxjs/core/driver";

/**
 * Simulate what MonoDriver does: translate AI SDK fullStream events to engine events.
 * This mirrors the logic in MonoDriver.receive() to test the ordering fix.
 */
function simulateDriverTranslation(sdkEvents: Array<{ type: string; data?: any }>): DriverStreamEvent[] {
  const driverEvents: DriverStreamEvent[] = [];
  let messageStartEmitted = false;
  let hasToolCallsInStep = false;

  for (const evt of sdkEvents) {
    switch (evt.type) {
      case "start":
      case "start-step":
        if (!messageStartEmitted) {
          driverEvents.push(createEvent("message_start", { messageId: `msg_${Date.now()}`, model: "test" }));
          messageStartEmitted = true;
        }
        hasToolCallsInStep = false;
        break;

      case "text-delta":
        driverEvents.push(createEvent("text_delta", { text: evt.data.text }));
        break;

      case "tool-input-start":
        driverEvents.push(createEvent("tool_use_start", {
          toolCallId: evt.data.toolCallId,
          toolName: evt.data.toolName,
        }));
        break;

      case "tool-input-delta":
        driverEvents.push(createEvent("input_json_delta", {
          partialJson: evt.data.partialJson,
        }));
        break;

      case "tool-call":
        hasToolCallsInStep = true;
        driverEvents.push(createEvent("tool_use_stop", {
          toolCallId: evt.data.toolCallId,
          toolName: evt.data.toolName,
          input: evt.data.input,
        }));
        break;

      case "tool-result":
        // Key fix: emit message_stop BEFORE first tool-result
        if (hasToolCallsInStep) {
          driverEvents.push(createEvent("message_stop", { stopReason: toStopReason("tool-calls") }));
          hasToolCallsInStep = false;
        }
        driverEvents.push(createEvent("tool_result", {
          toolCallId: evt.data.toolCallId,
          result: evt.data.result,
          isError: false,
        }));
        break;

      case "finish-step":
        messageStartEmitted = false;
        break;

      case "finish":
        driverEvents.push(createEvent("message_stop", { stopReason: toStopReason(evt.data?.finishReason ?? "stop") }));
        break;
    }
  }
  return driverEvents;
}

let sdkStreamEvents: Array<{ type: string; data?: any }>;
let driverEvents: DriverStreamEvent[];
let assembledMessages: Array<{ type: string; data: any }>;

Given("a multi-step tool execution produces stream events in order:", function (_table: any) {
  // Construct AI SDK stream events matching the full sequence:
  // tool-input-start → tool-input-delta → tool-call → tool-result
  sdkStreamEvents = [
    { type: "start" },
    { type: "start-step" },
    { type: "text-delta", data: { text: "Let me check." } },
    { type: "tool-input-start", data: { toolCallId: "call-001", toolName: "bash_tool" } },
    { type: "tool-input-delta", data: { partialJson: '{"command":"ls -la"}' } },
    { type: "tool-call", data: { toolCallId: "call-001", toolName: "bash_tool", input: { command: "ls -la" } } },
    { type: "tool-result", data: { toolCallId: "call-001", result: "file listing" } },
    { type: "finish-step", data: { finishReason: "tool-calls" } },
    { type: "start-step" },
    { type: "text-delta", data: { text: "Here are the files." } },
    { type: "finish-step", data: { finishReason: "stop" } },
    { type: "finish", data: { finishReason: "stop" } },
  ];
});

When("the driver translates these to engine events", function () {
  driverEvents = simulateDriverTranslation(sdkStreamEvents);

  // Now feed driver events through the messageAssemblerProcessor
  let state: MessageAssemblerState = createInitialMessageAssemblerState();
  assembledMessages = [];

  for (const evt of driverEvents) {
    const [newState, outputs] = messageAssemblerProcessor(state, evt);
    state = newState;
    for (const output of outputs) {
      assembledMessages.push(output);
    }
  }
});

Then("the engine events must include message_stop before tool_result", function () {
  // Find indices of message_stop and tool_result in driverEvents
  const eventTypes = driverEvents.map((e) => e.type);

  const firstToolResultIdx = eventTypes.indexOf("tool_result");
  assert.ok(firstToolResultIdx >= 0, "No tool_result event found");

  // Find the last message_stop BEFORE the first tool_result
  let messageStopBeforeToolResult = -1;
  for (let i = 0; i < firstToolResultIdx; i++) {
    if (eventTypes[i] === "message_stop") {
      messageStopBeforeToolResult = i;
    }
  }

  assert.ok(
    messageStopBeforeToolResult >= 0,
    `No message_stop found before tool_result.\n` +
      `  Event sequence: ${eventTypes.join(" → ")}\n` +
      `  Expected message_stop before index ${firstToolResultIdx}`
  );
});

Then("the resulting message sequence is:", function (table: any) {
  const rows = table.hashes();

  assert.strictEqual(
    assembledMessages.length,
    rows.length,
    `Expected ${rows.length} messages, got ${assembledMessages.length}.\n` +
      `  Actual: ${assembledMessages.map((m) => m.type).join(", ")}`
  );

  for (let i = 0; i < rows.length; i++) {
    const expected = rows[i];
    const actual = assembledMessages[i];
    const order = parseInt(expected.order, 10);
    const expectedType = expected.type;

    assert.strictEqual(i + 1, order, `Row order mismatch at index ${i}`);

    if (expectedType === "AssistantMessage") {
      assert.strictEqual(actual.type, "assistant_message", `Message ${order}: expected assistant_message, got ${actual.type}`);
    } else if (expectedType === "ToolResultMessage") {
      assert.strictEqual(actual.type, "tool_result_message", `Message ${order}: expected tool_result_message, got ${actual.type}`);
    }

    // Verify key content
    const keyContent = expected["key content"] as string;
    const msg = actual.data as any;

    if (keyContent.includes("tool-call")) {
      // AssistantMessage with tool calls
      const content = Array.isArray(msg.content) ? msg.content : [];
      const hasToolCall = content.some((p: any) => p.type === "tool-call");
      assert.ok(hasToolCall, `Message ${order}: expected tool-call in content, found ${content.map((p: any) => p.type).join(", ")}`);

      // Check specific tool call ID if mentioned
      const match = keyContent.match(/tool-call\(([^)]+)\)/);
      if (match) {
        const expectedId = match[1];
        const toolCall = content.find((p: any) => p.type === "tool-call");
        assert.strictEqual(toolCall.id, expectedId, `Message ${order}: expected tool call ID ${expectedId}`);
      }
    } else if (keyContent.includes("toolCallId")) {
      // ToolResultMessage
      const match = keyContent.match(/toolCallId\s*=\s*(\S+)/);
      if (match) {
        assert.strictEqual(msg.toolCallId, match[1], `Message ${order}: toolCallId mismatch`);
      }
    } else if (keyContent.startsWith("Here are")) {
      // Final text-only AssistantMessage
      const text = typeof msg.content === "string"
        ? msg.content
        : (Array.isArray(msg.content)
          ? msg.content.filter((p: any) => p.type === "text").map((p: any) => p.text).join("")
          : "");
      assert.ok(text.includes("Here are"), `Message ${order}: expected text containing "Here are", got "${text}"`);
    }
  }
});

// --- Scenario 6: Converted messages pass AI SDK Zod schema validation ---

let schemaTestMessages: Message[];
let schemaTestConverted: Array<ModelMessage | null>;

Given("a complete conversation with user, assistant \\(text+tool-calls), and tool results", function () {
  schemaTestMessages = [
    // 1. User message
    {
      id: "msg-u1",
      role: "user",
      subtype: "user",
      content: "Hello",
      timestamp: Date.now(),
    },
    // 2. Assistant with tool call
    {
      id: "msg-a1",
      role: "assistant",
      subtype: "assistant",
      content: [
        { type: "text", text: "Let me check." },
        { type: "tool-call", id: "call-001", name: "bash_tool", input: { command: "ls" } },
      ],
      timestamp: Date.now(),
    },
    // 3. Tool result
    {
      id: "msg-t1",
      role: "tool",
      subtype: "tool-result",
      toolCallId: "call-001",
      toolResult: {
        type: "tool-result",
        id: "call-001",
        name: "bash_tool",
        output: { type: "text", value: "file1.txt\nfile2.txt" },
      },
      timestamp: Date.now(),
    },
    // 4. Final assistant text
    {
      id: "msg-a2",
      role: "assistant",
      subtype: "assistant",
      content: "Here are your files.",
      timestamp: Date.now(),
    },
  ] as Message[];
});

When("each message is converted via toVercelMessage\\()", function () {
  schemaTestConverted = schemaTestMessages.map((m) => toVercelMessage(m));
});

Then("every converted message must pass the AI SDK modelMessageSchema", function () {
  for (let i = 0; i < schemaTestConverted.length; i++) {
    const converted = schemaTestConverted[i];
    if (!converted) continue;

    const result = modelMessageSchema.safeParse(converted);
    if (!result.success) {
      const source = schemaTestMessages[i];
      assert.fail(
        `Message #${i + 1} (${source.subtype}) failed AI SDK schema validation:\n` +
          `  Errors: ${JSON.stringify(result.error.issues, null, 2)}\n` +
          `  Converted: ${JSON.stringify(converted, null, 2)}`
      );
    }
  }
});

// --- Scenario 7: Full conversation with tool calls then follow-up text ---

let fullConvoHistory: Message[];
let fullConvoVercelMessages: ModelMessage[];

Given("a session stores the following conversation history:", function (_table: any) {
  // Build the exact message sequence that would be stored in the session
  // after: user→text, user→bash tool→result, then user follow-up
  fullConvoHistory = [
    // Turn 1: simple text exchange
    {
      id: "msg-u1",
      role: "user",
      subtype: "user",
      content: "你好啊",
      timestamp: Date.now() - 5000,
    },
    {
      id: "msg-a1",
      role: "assistant",
      subtype: "assistant",
      content: "您好！我是您的AI助手。",
      timestamp: Date.now() - 4000,
    },
    // Turn 2: tool call flow (after multi-step fix, message ordering is correct)
    {
      id: "msg-u2",
      role: "user",
      subtype: "user",
      content: "你用 bash 计算一下 2342342 + 675675",
      timestamp: Date.now() - 3000,
    },
    // Step 1: assistant with tool call (created by message_stop before tool-result)
    {
      id: "msg-a2",
      role: "assistant",
      subtype: "assistant",
      content: [
        { type: "text", text: "好的，我来用bash帮您计算一下 2342342 + 675675：" },
        {
          type: "tool-call",
          id: "call-bash-001",
          name: "bash_tool",
          input: { command: "echo $((2342342 + 675675))" },
        },
      ],
      timestamp: Date.now() - 2500,
    },
    // Step 1: tool result
    {
      id: "msg-tr1",
      role: "tool",
      subtype: "tool-result",
      toolCallId: "call-bash-001",
      toolResult: {
        type: "tool-result",
        id: "call-bash-001",
        name: "bash_tool",
        output: { type: "text", value: "3018017" },
      },
      timestamp: Date.now() - 2000,
    },
    // Step 2: assistant final text response
    {
      id: "msg-a3",
      role: "assistant",
      subtype: "assistant",
      content: "计算结果是：3018017\n\n2342342 + 675675 = 3018017",
      timestamp: Date.now() - 1000,
    },
  ] as Message[];
});

When(
  "the driver loads history and prepares the next request with {string}",
  function (userText: string) {
    // This is exactly what MonoDriver.receive() does:
    // 1. Load history from session
    // 2. Convert via toVercelMessages()
    // 3. Add new user message
    const converted = toVercelMessages(fullConvoHistory);
    converted.push({
      role: "user",
      content: userText,
    });
    fullConvoVercelMessages = converted;
  }
);

Then("the full message array must pass AI SDK modelMessageSchema validation", function () {
  for (let i = 0; i < fullConvoVercelMessages.length; i++) {
    const msg = fullConvoVercelMessages[i];
    const result = modelMessageSchema.safeParse(msg);
    if (!result.success) {
      assert.fail(
        `Message #${i + 1} (role: ${(msg as any).role}) failed AI SDK schema validation:\n` +
          `  Zod errors: ${JSON.stringify(result.error.issues, null, 2)}\n` +
          `  Message: ${JSON.stringify(msg, null, 2)}`
      );
    }
  }
});

Then("the Anthropic provider must be able to convert all messages without error", function () {
  // Validate the message sequence follows Anthropic's rules:
  // - Messages must alternate user/assistant (tool messages count as user)
  // - No consecutive messages of the same role (except tool after assistant)

  const roles = fullConvoVercelMessages.map((m) => {
    const role = (m as any).role;
    // Anthropic groups tool messages as user
    return role === "tool" ? "user" : role;
  });

  for (let i = 1; i < roles.length; i++) {
    if (roles[i] === roles[i - 1] && roles[i] !== "user") {
      // Two consecutive assistant messages are not allowed
      assert.fail(
        `Consecutive ${roles[i]} messages at index ${i - 1} and ${i}.\n` +
          `  Role sequence: ${roles.join(" → ")}\n` +
          `  This would cause Anthropic API to reject the request.`
      );
    }
  }

  // Verify no undefined/null fields in tool-call parts (the args vs input bug)
  for (let i = 0; i < fullConvoVercelMessages.length; i++) {
    const msg = fullConvoVercelMessages[i] as any;
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "tool-call") {
          assert.ok(
            part.input !== undefined,
            `Assistant message #${i + 1} has tool-call with undefined "input".\n` +
              `  This means the converter used "args" instead of "input".\n` +
              `  Tool call: ${JSON.stringify(part, null, 2)}`
          );
          assert.ok(
            part.toolCallId !== undefined,
            `Assistant message #${i + 1} has tool-call with undefined "toolCallId".`
          );
          assert.ok(
            part.toolName !== undefined,
            `Assistant message #${i + 1} has tool-call with undefined "toolName".`
          );
        }
      }
    }
    if (msg.role === "tool" && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "tool-result") {
          assert.ok(
            part.output !== undefined,
            `Tool message #${i + 1} has tool-result with undefined "output".`
          );
          assert.ok(
            part.toolCallId !== undefined,
            `Tool message #${i + 1} has tool-result with undefined "toolCallId".`
          );
        }
      }
    }
  }
});

// ============================================================================
// Helpers
// ============================================================================

/**
 * Resolve a dot/bracket path like "content[0].toolCallId" from an object
 */
function resolvePath(obj: any, path: string): any {
  // Handle paths like "message.toolCallId" or "content[0].toolCallId"
  // Strip the root reference (e.g., "message." prefix)
  const cleaned = path
    .replace(/^message\./, "")
    .replace(/^content/, "content");

  return resolveDotPath(obj, cleaned);
}

function resolveDotPath(obj: any, path: string): any {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}
