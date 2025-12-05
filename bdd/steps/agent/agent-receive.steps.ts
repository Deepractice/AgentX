/**
 * Step definitions for agent-receive.feature
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert";
import type { AgentWorld } from "./world.js";
import type { StreamEvent } from "@agentxjs/types/agent";

// ==================== Given Steps ====================

Given("the driver will produce text response {string}", function (this: AgentWorld, text: string) {
  this.driver.setTextResponse(text);
});

Given("the driver will produce a tool call", function (this: AgentWorld) {
  const timestamp = Date.now();
  const events: StreamEvent[] = [
    {
      type: "message_start",
      timestamp,
      data: { messageId: `msg_${timestamp}`, model: "mock" },
    },
    {
      type: "tool_use_start",
      timestamp: timestamp + 1,
      data: { toolCallId: "tool_1", toolName: "get_time" },
    },
    {
      type: "input_json_delta",
      timestamp: timestamp + 2,
      data: { partialJson: "{}" },
    },
    {
      type: "tool_use_stop",
      timestamp: timestamp + 3,
      data: { toolCallId: "tool_1", toolName: "get_time", input: {} },
    },
    {
      type: "message_stop",
      timestamp: timestamp + 4,
      data: { stopReason: "tool_use" },
    },
  ];
  this.driver.setEvents(events);
});

Given("the driver will delay response for {int}ms", function (this: AgentWorld, ms: number) {
  this.driver.setDelay(ms);
});

Given("the driver will echo back the message", function (this: AgentWorld) {
  // MockDriver will use default text response behavior
});

Given("the driver will produce text deltas:", function (this: AgentWorld, dataTable: any) {
  const rows = dataTable.hashes();
  const timestamp = Date.now();

  const events: StreamEvent[] = [
    {
      type: "message_start",
      timestamp,
      data: { messageId: `msg_${timestamp}`, model: "mock" },
    },
  ];

  rows.forEach((row: { text: string }, index: number) => {
    events.push({
      type: "text_delta",
      timestamp: timestamp + index + 1,
      data: { text: row.text },
    });
  });

  events.push({
    type: "message_stop",
    timestamp: timestamp + rows.length + 1,
    data: { stopReason: "end_turn" },
  });

  this.driver.setEvents(events);
});

Given("a UserMessage with id {string} and content {string}", function (this: AgentWorld, id: string, content: string) {
  this.userMessage = {
    id,
    role: "user",
    subtype: "user",
    content,
    timestamp: Date.now(),
  };
});

// ==================== When Steps ====================

When("I send message {string}", async function (this: AgentWorld, message: string) {
  this.stateTransitions = [];

  // Subscribe to state changes to track transitions
  this.agent.onStateChange(({ current }) => {
    this.stateTransitions.push(current);
  });

  await this.agent.receive(message);
});

When("I send the UserMessage", async function (this: AgentWorld) {
  await this.agent.receive(this.userMessage!);
});

When("I send message {string} without waiting", function (this: AgentWorld, message: string) {
  const promise = this.agent.receive(message);
  this.receivePromises.push({
    message,
    promise: promise.catch((e) => {
      const entry = this.receivePromises.find(r => r.message === message);
      if (entry) {
        entry.rejected = true;
        entry.error = e;
      }
    }),
  });
});

When("I wait for all messages to complete", async function (this: AgentWorld) {
  await Promise.all(this.receivePromises.map(r => r.promise));
  this.receivePromises = [];
});

When("after tool result is provided", async function (this: AgentWorld) {
  // Simulate continuation after tool result
  const timestamp = Date.now();
  this.driver.setEvents([
    {
      type: "tool_result",
      timestamp,
      data: { toolCallId: "tool_1", result: "12:00 PM", isError: false },
    },
    {
      type: "message_start",
      timestamp: timestamp + 1,
      data: { messageId: `msg_${timestamp}`, model: "mock" },
    },
    {
      type: "text_delta",
      timestamp: timestamp + 2,
      data: { text: "The time is 12:00 PM" },
    },
    {
      type: "message_stop",
      timestamp: timestamp + 3,
      data: { stopReason: "end_turn" },
    },
  ]);

  this.stateTransitions = [];
  await this.agent.receive("continue");
});

// ==================== Then Steps ====================

Then("the driver should receive a UserMessage with content {string}", function (this: AgentWorld, content: string) {
  const messages = this.driver.receivedMessages;
  assert.ok(messages.length > 0, "Driver should have received a message");
  const lastMessage = messages[messages.length - 1];
  assert.strictEqual(lastMessage.content, content);
});

Then("the receive promise should resolve when processing completes", function (this: AgentWorld) {
  // This is implicit in the async step - if we get here, promise resolved
  assert.ok(true);
});

Then("the driver should receive the same UserMessage", function (this: AgentWorld) {
  const messages = this.driver.receivedMessages;
  assert.ok(messages.length > 0, "Driver should have received a message");
  const lastMessage = messages[messages.length - 1];
  assert.strictEqual(lastMessage.id, this.userMessage!.id);
  assert.strictEqual(lastMessage.content, this.userMessage!.content);
});

Then("the state should transition through:", function (this: AgentWorld, dataTable: any) {
  const expectedStates = dataTable.hashes().map((row: { state: string }) => row.state);

  // Check that all expected states appear in order
  let lastIndex = -1;
  for (const expected of expectedStates) {
    const index = this.stateTransitions.indexOf(expected, lastIndex + 1);
    assert.ok(
      index > lastIndex,
      `State "${expected}" should appear after previous state. Actual transitions: ${this.stateTransitions.join(" -> ")}`
    );
    lastIndex = index;
  }
});

Then("the messageQueue length should be {int}", function (this: AgentWorld, length: number) {
  assert.strictEqual(this.agent.messageQueue.length, length);
});

Then("the messageQueue isEmpty should be {word}", function (this: AgentWorld, isEmpty: string) {
  assert.strictEqual(this.agent.messageQueue.isEmpty, isEmpty === "true");
});

Then("the driver should have received messages in order:", function (this: AgentWorld, dataTable: any) {
  const expectedOrder = dataTable.hashes().map((row: { content: string }) => row.content);
  const actualOrder = this.driver.receivedMessages.map(m => m.content);

  assert.deepStrictEqual(actualOrder, expectedOrder);
});

Then("the messageQueue should be empty", function (this: AgentWorld) {
  assert.strictEqual(this.agent.messageQueue.isEmpty, true);
  assert.strictEqual(this.agent.messageQueue.length, 0);
});

Then("the presenter should receive message_start event", function (this: AgentWorld) {
  assert.ok(this.presenter.hasEventType("message_start"), "Presenter should receive message_start");
});

Then("the presenter should receive text_delta events", function (this: AgentWorld) {
  assert.ok(this.presenter.hasEventType("text_delta"), "Presenter should receive text_delta");
});

Then("the presenter should receive message_stop event", function (this: AgentWorld) {
  assert.ok(this.presenter.hasEventType("message_stop"), "Presenter should receive message_stop");
});

Then("the presenter should receive {int} text_delta events", function (this: AgentWorld, count: number) {
  assert.strictEqual(this.presenter.countByType("text_delta"), count);
});
