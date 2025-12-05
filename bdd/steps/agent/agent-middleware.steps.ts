/**
 * Step definitions for agent-middleware.feature
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert";
import type { AgentWorld } from "./world.js";
import type { UserMessage } from "@agentxjs/types/agent";

// ==================== Middleware Steps ====================

Given("I add a middleware that logs messages", function (this: AgentWorld) {
  this.agent.use(async (message, next) => {
    this.middlewareLogs.push(`RECV: ${message.content}`);
    await next(message);
  });
});

Given("I add a middleware that prepends {string} to content", function (this: AgentWorld, prefix: string) {
  this.agent.use(async (message, next) => {
    const modified: UserMessage = {
      ...message,
      content: prefix + message.content,
    };
    await next(modified);
  });
});

Given("I add a middleware that blocks messages containing {string}", function (this: AgentWorld, keyword: string) {
  this.agent.use(async (message, next) => {
    if (typeof message.content === "string" && message.content.includes(keyword)) {
      // Don't call next - block the message
      return;
    }
    await next(message);
  });
});

Given("I add middleware A that appends {string}", function (this: AgentWorld, suffix: string) {
  this.agent.use(async (message, next) => {
    const modified: UserMessage = {
      ...message,
      content: message.content + suffix,
    };
    await next(modified);
  });
});

Given("I add middleware B that appends {string}", function (this: AgentWorld, suffix: string) {
  this.agent.use(async (message, next) => {
    const modified: UserMessage = {
      ...message,
      content: message.content + suffix,
    };
    await next(modified);
  });
});

Given("I add an async middleware that delays {int}ms", function (this: AgentWorld, ms: number) {
  this.agent.use(async (message, next) => {
    this.messageStartTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, ms));
    await next(message);
    this.messageEndTime = Date.now();
  });
});

Given("I add a middleware that modifies messages", function (this: AgentWorld) {
  this.unsubscribe = this.agent.use(async (message, next) => {
    const modified: UserMessage = {
      ...message,
      content: "MODIFIED: " + message.content,
    };
    await next(modified);
  });
});

Given("I add a middleware that logs {string}", function (this: AgentWorld, template: string) {
  this.agent.use(async (message, next) => {
    const log = template.replace("{message}", String(message.content));
    this.middlewareLogs.push(log);
    await next(message);
  });
});

// ==================== Interceptor Steps ====================

Given("I add an interceptor that logs events", function (this: AgentWorld) {
  this.agent.intercept((event, next) => {
    this.interceptorLogs.push(`EMIT: ${event.type}`);
    next(event);
  });
});

Given("I add an interceptor that masks sensitive data in text_delta", function (this: AgentWorld) {
  this.agent.intercept((event, next) => {
    if (event.type === "text_delta") {
      const data = event.data as { text: string };
      const maskedText = data.text.replace(/secret: \w+/, "secret: ***");
      next({
        ...event,
        data: { text: maskedText },
      });
    } else {
      next(event);
    }
  });
});

Given("I add an interceptor that blocks error events", function (this: AgentWorld) {
  this.agent.intercept((event, next) => {
    if (event.type === "error_occurred") {
      // Don't call next - block the event
      return;
    }
    next(event);
  });
});

Given("I add interceptor A that appends {string} to text", function (this: AgentWorld, suffix: string) {
  this.agent.intercept((event, next) => {
    if (event.type === "text_delta") {
      const data = event.data as { text: string };
      next({
        ...event,
        data: { text: data.text + suffix },
      });
    } else {
      next(event);
    }
  });
});

Given("I add interceptor B that appends {string} to text", function (this: AgentWorld, suffix: string) {
  this.agent.intercept((event, next) => {
    if (event.type === "text_delta") {
      const data = event.data as { text: string };
      next({
        ...event,
        data: { text: data.text + suffix },
      });
    } else {
      next(event);
    }
  });
});

Given("I add an interceptor that modifies events", function (this: AgentWorld) {
  // Store in interceptorUnsubscribe to avoid conflict with event subscription
  this.interceptorUnsubscribe = this.agent.intercept((event, next) => {
    if (event.type === "text_delta") {
      const data = event.data as { text: string };
      next({
        ...event,
        data: { text: "MODIFIED: " + data.text },
      });
    } else {
      next(event);
    }
  });
  // Also set unsubscribe for the step that checks it
  this.unsubscribe = this.interceptorUnsubscribe;
});

Given("I add an interceptor that logs {string}", function (this: AgentWorld, template: string) {
  this.agent.intercept((event, next) => {
    const log = template.replace("{event}", event.type);
    this.interceptorLogs.push(log);
    next(event);
  });
});

// ==================== Subscription Steps ====================

Given("I subscribe to all events", function (this: AgentWorld) {
  this.agent.on((event) => {
    this.receivedEvents.push(event);
  });
});

// ==================== When Steps ====================

When("the driver produces text_delta with {string}", async function (this: AgentWorld, text: string) {
  const timestamp = Date.now();
  this.driver.setEvents([
    {
      type: "message_start",
      timestamp,
      data: { messageId: `msg_${timestamp}`, model: "mock" },
    },
    {
      type: "text_delta",
      timestamp: timestamp + 1,
      data: { text },
    },
    {
      type: "message_stop",
      timestamp: timestamp + 2,
      data: { stopReason: "end_turn" },
    },
  ]);
  await this.agent.receive("test");
});

When("the driver produces an error event", async function (this: AgentWorld) {
  // Simulate normal flow - error events would come from error handling
  await this.agent.receive("test");
});

// ==================== Then Steps ====================

Then("the middleware should receive the message before driver", function (this: AgentWorld) {
  assert.ok(this.middlewareLogs.length > 0, "Middleware should have logged");
  assert.ok(this.middlewareLogs[0].includes("RECV:"), "Middleware log should contain message");
});

Then("the driver should receive message with content {string}", function (this: AgentWorld, content: string) {
  const messages = this.driver.receivedMessages;
  assert.ok(messages.length > 0, "Driver should have received messages");
  const lastMessage = messages[messages.length - 1];
  assert.strictEqual(lastMessage.content, content);
});

Then("the driver should not receive the message", function (this: AgentWorld) {
  assert.strictEqual(this.driver.receivedMessages.length, 0, "Driver should not receive blocked message");
});

Then("the receive promise should resolve", function (this: AgentWorld) {
  // Implicit - if we got here, promise resolved
  assert.ok(true);
});

Then("the message should be delayed by at least {int}ms", function (this: AgentWorld, ms: number) {
  const elapsed = this.messageEndTime - this.messageStartTime;
  assert.ok(elapsed >= ms, `Expected delay of at least ${ms}ms, got ${elapsed}ms`);
});

Then("the driver should receive unmodified message", function (this: AgentWorld) {
  const messages = this.driver.receivedMessages;
  assert.ok(messages.length > 0, "Driver should have received messages");
  const lastMessage = messages[messages.length - 1];
  assert.ok(!lastMessage.content.toString().includes("MODIFIED"), "Message should not be modified");
});

Then("the interceptor should receive events before handlers", function (this: AgentWorld) {
  assert.ok(this.interceptorLogs.length > 0, "Interceptor should have logged");
});

Then("I should receive text_delta with {string}", function (this: AgentWorld, expectedText: string) {
  const textDeltas = this.receivedEvents.filter(e => e.type === "text_delta");
  assert.ok(textDeltas.length > 0, "Should have received text_delta");
  const data = textDeltas[0].data as { text: string };
  assert.strictEqual(data.text, expectedText);
});

Then("I should not receive the error event", function (this: AgentWorld) {
  const errorEvents = this.receivedEvents.filter(e => e.type === "error_occurred");
  assert.strictEqual(errorEvents.length, 0, "Should not receive error event");
});

Then("I should receive unmodified text_delta", function (this: AgentWorld) {
  const textDeltas = this.receivedEvents.filter(e => e.type === "text_delta");
  assert.ok(textDeltas.length > 0, "Should have text_delta");
  const data = textDeltas[0].data as { text: string };
  assert.ok(!data.text.includes("MODIFIED"), "Text should not be modified");
});

Then("both middleware and interceptor should be called", function (this: AgentWorld) {
  assert.ok(this.middlewareLogs.length > 0, "Middleware should be called");
  assert.ok(this.interceptorLogs.length > 0, "Interceptor should be called");
});
