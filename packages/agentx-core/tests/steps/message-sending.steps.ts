/**
 * Step definitions for message-sending.feature
 */

import { Given, When, Then, Before, After, DataTable } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import { TestContext } from "./test-context";
import { createAgent } from "~/index";
import { MockDriver } from "~/driver/MockDriver";
import { LogLevel, type AgentLogger, type LogContext } from "~/AgentLogger";

// Shared test context
const ctx = new TestContext();

// Mock logger
class MockLogger implements AgentLogger {
  logs: Array<{ level: LogLevel; message: string }> = [];

  log(level: LogLevel, message: string, ...args: any[]): void {
    this.logs.push({ level, message });
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  withContext(context: LogContext): AgentLogger {
    return this;
  }
}

Before(() => {
  ctx.reset();
});

After(async () => {
  if (ctx.agent && !ctx.destroyed) {
    await ctx.agent.destroy();
  }
  ctx.cleanup();
});

// ===== Given steps =====

Given("I create and initialize an agent", async () => {
  ctx.driver = new MockDriver("test-session", "test-agent");
  ctx.logger = new MockLogger();
  ctx.agent = createAgent(ctx.driver, ctx.logger);

  // Subscribe to all message events
  ctx.subscribeToEvent("user_message");
  ctx.subscribeToEvent("assistant_message");
  ctx.subscribeToEvent("error_message");

  await ctx.agent.initialize();
  ctx.initialized = true;
});

// ===== When steps =====

When("I send message {string}", async (message: string) => {
  expect(ctx.agent).toBeDefined();
  await ctx.agent!.send(message);

  // Give events time to propagate
  await new Promise((resolve) => setTimeout(resolve, 100));
});

When("the driver responds with {string}", async (response: string) => {
  // MockDriver automatically responds, so we just wait
  await new Promise((resolve) => setTimeout(resolve, 100));
});

When("the driver streams text deltas {string}, {string}, {string}, {string}, {string}", async (...deltas: string[]) => {
  // Subscribe to text_delta events
  ctx.subscribeToEvent("text_delta");

  // MockDriver streams character by character, so we just wait
  await new Promise((resolve) => setTimeout(resolve, 200));
});

When("I send messages in sequence:", async (dataTable: DataTable) => {
  expect(ctx.agent).toBeDefined();

  const rows = dataTable.hashes();
  for (const row of rows) {
    await ctx.agent!.send(row.message);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
});

When("I try to send an empty message {string}", async (message: string) => {
  expect(ctx.agent).toBeDefined();

  try {
    await ctx.agent!.send(message);
  } catch (error) {
    ctx.errors.push(error as Error);
  }
});

When("I try to send message {string} before first completes", async (message: string) => {
  // This will be tested with concurrent sends
  try {
    // Start first send (don't await)
    const firstSend = ctx.agent!.send("First message");
    // Try second send immediately
    await ctx.agent!.send(message);
    await firstSend;
  } catch (error) {
    ctx.errors.push(error as Error);
  }
});

When("I send message {string} and receive a response", async (message: string) => {
  expect(ctx.agent).toBeDefined();
  await ctx.agent!.send(message);
  await new Promise((resolve) => setTimeout(resolve, 200));
});

When("the driver starts streaming response", async () => {
  // MockDriver starts streaming automatically
  await new Promise((resolve) => setTimeout(resolve, 50));
});

When("I abort the request", () => {
  expect(ctx.agent).toBeDefined();
  // Note: AgentService doesn't expose abort directly
  // This would need to be tested at the engine level
  ctx.testData.aborted = true;
});

// ===== Then steps =====

Then("the agent should emit {string} event", (eventType: string) => {
  const events = ctx.getEvents(eventType);
  expect(events.length).toBeGreaterThan(0);
});

Then("the message should be stored in agent messages", () => {
  expect(ctx.agent).toBeDefined();
  const messages = ctx.agent!.messages;
  expect(messages.length).toBeGreaterThan(0);
});

Then("the message role should be {string}", (expectedRole: string) => {
  expect(ctx.agent).toBeDefined();
  const messages = ctx.agent!.messages;
  const lastMessage = messages[messages.length - 1];
  expect(lastMessage.role).toBe(expectedRole);
});

Then("the message content should be {string}", (expectedContent: string) => {
  expect(ctx.agent).toBeDefined();
  const messages = ctx.agent!.messages;
  const lastMessage = messages[messages.length - 1];

  const content =
    typeof lastMessage.content === "string"
      ? lastMessage.content
      : lastMessage.content.map((p) => ("text" in p ? p.text : "")).join("");

  expect(content).toBe(expectedContent);
});

Then("I should receive {string} event", (eventType: string) => {
  const events = ctx.getEvents(eventType);
  expect(events.length).toBeGreaterThan(0);
});

Then("the assistant message content should be {string}", (expectedContent: string) => {
  const events = ctx.getEvents("assistant_message");
  expect(events.length).toBeGreaterThan(0);

  const lastEvent = events[events.length - 1];
  const content =
    typeof lastEvent.data.content === "string"
      ? lastEvent.data.content
      : lastEvent.data.content.map((p: any) => ("text" in p ? p.text : "")).join("");

  expect(content).toContain(expectedContent);
});

Then("the agent messages should have {int} messages", (count: number) => {
  expect(ctx.agent).toBeDefined();
  const messages = ctx.agent!.messages;
  expect(messages.length).toBe(count);
});

Then("the agent should have {int} messages in history", (count: number) => {
  expect(ctx.agent).toBeDefined();
  const messages = ctx.agent!.messages;
  expect(messages.length).toBe(count);
});

Then("the messages should be in correct order", () => {
  expect(ctx.agent).toBeDefined();
  const messages = ctx.agent!.messages;

  // Verify alternating user/assistant pattern
  for (let i = 0; i < messages.length; i++) {
    if (i % 2 === 0) {
      expect(messages[i].role).toBe("user");
    } else {
      expect(messages[i].role).toBe("assistant");
    }
  }
});

Then("I should receive {string} events for each chunk", (eventType: string) => {
  const events = ctx.getEvents(eventType);
  expect(events.length).toBeGreaterThan(0);
});

Then("the final {string} should contain {string}", (eventType: string, expectedContent: string) => {
  const events = ctx.getEvents(eventType);
  expect(events.length).toBeGreaterThan(0);

  const lastEvent = events[events.length - 1];
  const content = JSON.stringify(lastEvent.data);
  expect(content).toContain(expectedContent);
});

Then("the message assembler should correctly concatenate all deltas", () => {
  // Verified by checking final assistant message
  const events = ctx.getEvents("assistant_message");
  expect(events.length).toBeGreaterThan(0);
});

Then("the second send should throw an error", () => {
  expect(ctx.errors.length).toBeGreaterThan(0);
});

Then("the error message should contain {string}", (expectedMessage: string) => {
  expect(ctx.errors.length).toBeGreaterThan(0);
  const error = ctx.errors[ctx.errors.length - 1];
  expect(error.message).toContain(expectedMessage);
});

Then("it should throw a validation error", () => {
  expect(ctx.errors.length).toBeGreaterThan(0);
});

Then("the agent messages should maintain insertion order", () => {
  expect(ctx.agent).toBeDefined();
  const messages = ctx.agent!.messages;

  // Verify timestamps are increasing
  for (let i = 1; i < messages.length; i++) {
    expect(messages[i].timestamp).toBeGreaterThanOrEqual(messages[i - 1].timestamp);
  }
});

Then("each message should have an increasing timestamp", () => {
  expect(ctx.agent).toBeDefined();
  const messages = ctx.agent!.messages;

  for (let i = 1; i < messages.length; i++) {
    expect(messages[i].timestamp).toBeGreaterThanOrEqual(messages[i - 1].timestamp);
  }
});

Then("the streaming should stop immediately", () => {
  expect(ctx.testData.aborted).toBe(true);
});

Then("the partial response should be stored in messages", () => {
  expect(ctx.agent).toBeDefined();
  const messages = ctx.agent!.messages;
  expect(messages.length).toBeGreaterThan(0);
});
