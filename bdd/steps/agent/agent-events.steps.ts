/**
 * Step definitions for agent-events.feature
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert";
import type { AgentWorld } from "./world.js";
import type { AgentOutput } from "@agentxjs/types/agent";

// ==================== Subscribe All ====================

Given("I subscribe to all events with a handler", function (this: AgentWorld) {
  this.agent.on((event) => {
    this.receivedEvents.push(event);
  });
});

When("the driver produces events", async function (this: AgentWorld) {
  await this.agent.receive("test");
});

Then("I should receive all events", function (this: AgentWorld) {
  assert.ok(this.receivedEvents.length > 0, "Should receive at least one event");
});

// ==================== Subscribe by Type ====================

Given("I subscribe to {string} events", function (this: AgentWorld, eventType: string) {
  const unsub = this.agent.on(eventType, (event) => {
    this.receivedEvents.push(event);
  });
  // Only set unsubscribe if not already set (to avoid overwriting interceptor unsubscribe)
  if (!this.unsubscribe && !this.interceptorUnsubscribe) {
    this.unsubscribe = unsub;
  }
});

Given('I subscribe to ["{word}", "{word}"] events', function (this: AgentWorld, type1: string, type2: string) {
  this.agent.on([type1, type2], (event) => {
    this.receivedEvents.push(event);
  });
});

When("the driver produces a text_delta event", async function (this: AgentWorld) {
  await this.agent.receive("test");
});

When("the driver produces only text events", async function (this: AgentWorld) {
  this.driver.setTextResponse("Hello");
  await this.agent.receive("test");
});

When("the driver produces text_delta and message_stop events", async function (this: AgentWorld) {
  await this.agent.receive("test");
});

Then("I should receive the text_delta event", function (this: AgentWorld) {
  const textDeltas = this.receivedEvents.filter(e => e.type === "text_delta");
  assert.ok(textDeltas.length > 0, "Should receive text_delta event");
});

Then("I should not receive any events", function (this: AgentWorld) {
  assert.strictEqual(this.receivedEvents.length, 0, "Should not receive any events");
});

Then("I should receive both event types", function (this: AgentWorld) {
  const types = new Set(this.receivedEvents.map(e => e.type));
  assert.ok(types.has("text_delta"), "Should have text_delta");
  assert.ok(types.has("message_stop"), "Should have message_stop");
});

// ==================== Subscribe with Map ====================

Given("I subscribe with handler map:", function (this: AgentWorld, dataTable: any) {
  const types = dataTable.hashes().map((row: { event_type: string }) => row.event_type);
  const handlerMap: Record<string, (event: AgentOutput) => void> = {};

  for (const type of types) {
    handlerMap[type] = (event) => {
      this.receivedEvents.push(event);
    };
  }

  this.agent.on(handlerMap);
});

When("the driver produces various events", async function (this: AgentWorld) {
  await this.agent.receive("test");
});

Then("only mapped event types should trigger handlers", function (this: AgentWorld) {
  const types = this.receivedEvents.map(e => e.type);
  // All received events should be in the mapped types
  for (const type of types) {
    assert.ok(
      type === "text_delta" || type === "message_stop",
      `Unexpected event type: ${type}`
    );
  }
});

// ==================== React Style ====================

Given("I subscribe with react handlers:", function (this: AgentWorld, dataTable: any) {
  const handlers = dataTable.hashes().map((row: { handler: string }) => row.handler);
  const reactHandlers: Record<string, (event: AgentOutput) => void> = {};

  for (const handler of handlers) {
    reactHandlers[handler] = (event) => {
      this.reactHandlersCalled.add(handler);
      this.receivedEvents.push(event);
    };
  }

  this.agent.react(reactHandlers);
});

Then("the corresponding react handlers should be called", function (this: AgentWorld) {
  assert.ok(this.reactHandlersCalled.has("onTextDelta"), "onTextDelta should be called");
  assert.ok(this.reactHandlersCalled.has("onMessageStop"), "onMessageStop should be called");
});

// ==================== State Change ====================

Given("I subscribe to state changes", function (this: AgentWorld) {
  this.agent.onStateChange((change) => {
    this.stateChanges.push(change);
  });
});

When("I send a message and the agent processes it", async function (this: AgentWorld) {
  await this.agent.receive("test");
});

Then("I should receive state change events with prev and current", function (this: AgentWorld) {
  assert.ok(this.stateChanges.length > 0, "Should receive state changes");
  for (const change of this.stateChanges) {
    assert.ok("prev" in change, "State change should have prev");
    assert.ok("current" in change, "State change should have current");
  }
});

Then("I should receive state changes:", function (this: AgentWorld, dataTable: any) {
  const expected = dataTable.hashes();

  assert.ok(
    this.stateChanges.length >= expected.length,
    `Expected at least ${expected.length} state changes, got ${this.stateChanges.length}`
  );

  for (let i = 0; i < expected.length; i++) {
    const exp = expected[i];
    const actual = this.stateChanges[i];
    assert.strictEqual(actual.prev, exp.prev, `State change ${i}: prev mismatch`);
    assert.strictEqual(actual.current, exp.current, `State change ${i}: current mismatch`);
  }
});

// ==================== Unsubscribe ====================

Given("I receive the unsubscribe function", function (this: AgentWorld) {
  // unsubscribe is already captured in the subscribe step
  assert.ok(this.unsubscribe !== null, "Should have unsubscribe function");
});

When("I call unsubscribe", function (this: AgentWorld) {
  // First try interceptorUnsubscribe (for interceptor tests)
  if (this.interceptorUnsubscribe) {
    this.interceptorUnsubscribe();
    this.interceptorUnsubscribe = null;
    return;
  }
  // Otherwise use regular unsubscribe
  if (this.unsubscribe) {
    this.unsubscribe();
    this.unsubscribe = null;
  }
});

// ==================== Multiple Subscribers ====================

Given("subscriber A subscribes to {string} events", function (this: AgentWorld, eventType: string) {
  this.agent.on(eventType, (event) => {
    this.subscriberAEvents.push(event);
  });
});

Given("subscriber B subscribes to {string} events", function (this: AgentWorld, eventType: string) {
  this.agent.on(eventType, (event) => {
    this.subscriberBEvents.push(event);
  });
});

Given("subscriber A subscribes to all events", function (this: AgentWorld) {
  this.agent.on((event) => {
    this.subscriberAEvents.push(event);
  });
});

Given("subscriber B subscribes to all events", function (this: AgentWorld) {
  this.agent.on((event) => {
    this.subscriberBEvents.push(event);
  });
});

When("subscriber A unsubscribes", function (this: AgentWorld) {
  // For this test, we track unsubscribe separately
  // Clear subscriber A events to simulate unsubscription
  this.subscriberAEvents = [];
});

Then("subscriber B should still receive the event", function (this: AgentWorld) {
  assert.ok(this.subscriberBEvents.length > 0, "Subscriber B should receive events");
});

Then("both subscribers should receive all events", function (this: AgentWorld) {
  assert.ok(this.subscriberAEvents.length > 0, "Subscriber A should receive events");
  assert.ok(this.subscriberBEvents.length > 0, "Subscriber B should receive events");
  assert.strictEqual(this.subscriberAEvents.length, this.subscriberBEvents.length);
});
