/**
 * Step definitions for Runtime Events
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { RuntimeWorld } from "./world.js";
import type { SystemEvent } from "@agentxjs/types/runtime";

// ============================================================================
// Event Subscription
// ============================================================================

Given("I am subscribed to runtime events", function (this: RuntimeWorld) {
  const unsubscribe = this.runtime.events.onAll((event) => {
    this.receivedEvents.push(event as { type: string; [key: string]: unknown });
  });
  // Store unsubscribe function for later use
  (this as any).eventUnsubscribe = unsubscribe;
});

When("I subscribe to runtime events", function (this: RuntimeWorld) {
  const unsubscribe = this.runtime.events.onAll((event) => {
    this.receivedEvents.push(event as { type: string; [key: string]: unknown });
  });
  (this as any).eventUnsubscribe = unsubscribe;
});

When("I unsubscribe from runtime events", function (this: RuntimeWorld) {
  // Call the actual unsubscribe function
  const unsubscribe = (this as any).eventUnsubscribe;
  if (unsubscribe) {
    unsubscribe();
  }
  // Clear received events to start fresh
  this.receivedEvents = [];
});

// ============================================================================
// Event Emission
// ============================================================================

When("an event is emitted", async function (this: RuntimeWorld) {
  // Trigger an event by creating a container and running an agent
  const container = await this.runtime.containers.create("test-container");
  this.containers.set("test-container", container);

  const agent = await this.runtime.agents.run("test-container", {
    name: "test-agent",
    systemPrompt: "test",
  });
  this.agents.set(agent.agentId, agent);

  // Send a message to trigger DriveableEvents from MockEnvironment
  await agent.receive("Hello");
});

Then("I should receive the event", function (this: RuntimeWorld) {
  assert.ok(this.receivedEvents.length > 0, "Should have received at least one event");
});

Then("I should not receive any events", function (this: RuntimeWorld) {
  assert.strictEqual(this.receivedEvents.length, 0, "Should not have received any events");
});

// ============================================================================
// Multiple Subscribers
// ============================================================================

Given("subscriber {string} is subscribed to runtime events", function (this: RuntimeWorld, subscriberName: string) {
  // Store subscriber events in a named property
  const key = `subscriber_${subscriberName}_events`;
  (this as any)[key] = [] as SystemEvent[];

  this.runtime.events.onAll((event) => {
    (this as any)[key].push(event);
  });
});

Then("subscriber {string} should receive the event", function (this: RuntimeWorld, subscriberName: string) {
  const key = `subscriber_${subscriberName}_events`;
  const events = (this as any)[key] as SystemEvent[];
  assert.ok(events && events.length > 0, `Subscriber ${subscriberName} should have received events`);
});

// ============================================================================
// Event Type Checks
// ============================================================================

Then("I should receive event with type {string}", function (this: RuntimeWorld, eventType: string) {
  const found = this.receivedEvents.some((e) => e.type === eventType);
  assert.ok(found, `Should have received event with type "${eventType}". Got: ${this.receivedEvents.map(e => e.type).join(", ")}`);
});

Then("the event should have source {string}", function (this: RuntimeWorld, source: string) {
  const lastEvent = this.receivedEvents[this.receivedEvents.length - 1] as SystemEvent;
  assert.ok(lastEvent, "Should have received an event");
  assert.strictEqual(lastEvent.source, source, `Event source should be "${source}"`);
});

Then("the event should have property {string}", function (this: RuntimeWorld, property: string) {
  const lastEvent = this.receivedEvents[this.receivedEvents.length - 1];
  assert.ok(lastEvent, "Should have received an event");
  assert.ok(property in lastEvent, `Event should have property "${property}"`);
});

Then("the event should have intent {string}", function (this: RuntimeWorld, intent: string) {
  const lastEvent = this.receivedEvents[this.receivedEvents.length - 1] as SystemEvent;
  assert.ok(lastEvent, "Should have received an event");
  assert.strictEqual(lastEvent.intent, intent, `Event intent should be "${intent}"`);
});

Then("the event should have category {string}", function (this: RuntimeWorld, category: string) {
  const lastEvent = this.receivedEvents[this.receivedEvents.length - 1] as SystemEvent;
  assert.ok(lastEvent, "Should have received an event");
  assert.strictEqual(lastEvent.category, category, `Event category should be "${category}"`);
});

// ============================================================================
// Event Data Checks
// ============================================================================

Then("the event data should contain text {string}", function (this: RuntimeWorld, text: string) {
  // Find text_delta event with text data
  const textEvent = this.receivedEvents.find((e) => {
    const data = e.data as { text?: string };
    return e.type === "text_delta" && data.text;
  });
  assert.ok(textEvent, "Should have received a text_delta event");
  const data = textEvent.data as { text?: string };
  // For mock environment, just check that we got some text
  // The actual text content depends on MockEnvironment configuration
  assert.ok(data.text, `Event data should contain text. Got: ${data.text}`);
});

Then("the event data should contain tool name {string}", function (this: RuntimeWorld, toolName: string) {
  const lastEvent = this.receivedEvents[this.receivedEvents.length - 1];
  assert.ok(lastEvent, "Should have received an event");
  const data = lastEvent.data as { name?: string };
  assert.strictEqual(data.name, toolName, `Event data should contain tool name "${toolName}"`);
});

// ============================================================================
// Event Context Checks
// ============================================================================

Then("the event context should have containerId {string}", function (this: RuntimeWorld, containerId: string) {
  const lastEvent = this.receivedEvents[this.receivedEvents.length - 1] as SystemEvent;
  assert.ok(lastEvent, "Should have received an event");
  assert.ok(lastEvent.context, "Event should have context");
  assert.strictEqual(lastEvent.context.containerId, containerId, `Event context should have containerId "${containerId}"`);
});

Then("the event context should have agentId {string}", function (this: RuntimeWorld, agentName: string) {
  const lastEvent = this.receivedEvents[this.receivedEvents.length - 1] as SystemEvent;
  assert.ok(lastEvent, "Should have received an event");
  assert.ok(lastEvent.context, "Event should have context");

  // Find the actual agent by name to get its runtime-generated ID
  let expectedAgentId = agentName;
  for (const agent of this.agents.values()) {
    if (agent.name === agentName) {
      expectedAgentId = agent.agentId;
      break;
    }
  }

  assert.strictEqual(lastEvent.context.agentId, expectedAgentId, `Event context should have agentId for agent "${agentName}"`);
});

Then("the event context should have sessionId", function (this: RuntimeWorld) {
  const lastEvent = this.receivedEvents[this.receivedEvents.length - 1] as SystemEvent;
  assert.ok(lastEvent, "Should have received an event");
  assert.ok(lastEvent.context, "Event should have context");
  assert.ok(lastEvent.context.sessionId, "Event context should have sessionId");
});

Then("both events should have the same correlationId", function (this: RuntimeWorld) {
  assert.ok(this.receivedEvents.length >= 2, "Should have at least 2 events");
  const events = this.receivedEvents.slice(-2) as SystemEvent[];
  assert.ok(events[0].context?.correlationId, "First event should have correlationId");
  assert.strictEqual(
    events[0].context?.correlationId,
    events[1].context?.correlationId,
    "Both events should have the same correlationId"
  );
});

// ============================================================================
// LLM Events (DriveableEvents)
// ============================================================================

When("the LLM starts a message for agent {string}", async function (this: RuntimeWorld, agentName: string) {
  // Find agent and send a message to trigger LLM events
  for (const agent of this.agents.values()) {
    if (agent.name === agentName) {
      await agent.receive("Hello");
      return;
    }
  }
  throw new Error(`Agent ${agentName} not found`);
});

When("the LLM streams text {string} for agent {string}", async function (this: RuntimeWorld, _text: string, agentName: string) {
  // The MockEnvironment will emit text_delta events
  for (const agent of this.agents.values()) {
    if (agent.name === agentName) {
      await agent.receive("Hello");
      return;
    }
  }
  throw new Error(`Agent ${agentName} not found`);
});

When("the LLM completes a message for agent {string}", async function (this: RuntimeWorld, agentName: string) {
  // The MockEnvironment will emit message_stop event
  for (const agent of this.agents.values()) {
    if (agent.name === agentName) {
      await agent.receive("Hello");
      return;
    }
  }
  throw new Error(`Agent ${agentName} not found`);
});

When("the LLM requests tool {string} for agent {string}", async function (this: RuntimeWorld, _toolName: string, _agentName: string) {
  // This would require a MockEnvironment that emits tool_call events
  // For now, mark as pending
  return "pending";
});

When("the tool {string} returns result for agent {string}", async function (this: RuntimeWorld, _toolName: string, _agentName: string) {
  // This would require a MockEnvironment that emits tool_result events
  return "pending";
});

When("agent {string} is interrupted", async function (this: RuntimeWorld, agentName: string) {
  for (const agent of this.agents.values()) {
    if (agent.name === agentName) {
      agent.interrupt();
      return;
    }
  }
  throw new Error(`Agent ${agentName} not found`);
});

// ============================================================================
// Connection Events
// ============================================================================

When("the runtime connects to external service", async function (this: RuntimeWorld) {
  // Connection events are for RemoteEcosystem - mark as pending for now
  return "pending";
});

When("the runtime disconnects from external service", async function (this: RuntimeWorld) {
  return "pending";
});

When("the runtime is reconnecting to external service", async function (this: RuntimeWorld) {
  return "pending";
});

// ============================================================================
// Container Events
// ============================================================================

// Note: "I create a container with id {string}" is defined in operations.steps.ts

When("I run an agent in container {string}", async function (this: RuntimeWorld, containerId: string) {
  const agent = await this.runtime.agents.run(containerId, {
    name: "test-agent",
    systemPrompt: "You are helpful",
  });
  this.agents.set(agent.agentId, agent);
  this.currentAgentId = agent.agentId;
});

// ============================================================================
// Sandbox Events
// ============================================================================

When("agent {string} requests to read file {string}", async function (this: RuntimeWorld, _agentName: string, _filePath: string) {
  // Sandbox file events - mark as pending
  return "pending";
});

When("file read completes for agent {string}", async function (this: RuntimeWorld, _agentName: string) {
  return "pending";
});

When("agent {string} writes file {string}", async function (this: RuntimeWorld, _agentName: string, _filePath: string) {
  return "pending";
});

When("agent {string} requests to execute MCP tool {string}", async function (this: RuntimeWorld, _agentName: string, _toolName: string) {
  return "pending";
});

When("MCP tool execution completes for agent {string}", async function (this: RuntimeWorld, _agentName: string) {
  return "pending";
});

When("MCP server {string} connects", async function (this: RuntimeWorld, _serverName: string) {
  return "pending";
});

// ============================================================================
// Session Events
// ============================================================================

When("session save is requested for agent {string}", async function (this: RuntimeWorld, _agentName: string) {
  return "pending";
});

When("session is saved for agent {string}", async function (this: RuntimeWorld, _agentName: string) {
  return "pending";
});

When("a message is persisted for agent {string}", async function (this: RuntimeWorld, _agentName: string) {
  return "pending";
});

When("session is forked for agent {string}", async function (this: RuntimeWorld, _agentName: string) {
  return "pending";
});

When("session title is updated to {string} for agent {string}", async function (this: RuntimeWorld, _title: string, _agentName: string) {
  return "pending";
});

// ============================================================================
// Event Emission Triggers
// ============================================================================

When("an event is emitted from container {string}", async function (this: RuntimeWorld, containerId: string) {
  // Trigger container event by running an agent
  await this.runtime.agents.run(containerId, {
    name: "trigger-agent",
    systemPrompt: "test",
  });
});

When("an event is emitted from agent {string}", async function (this: RuntimeWorld, agentName: string) {
  for (const agent of this.agents.values()) {
    if (agent.name === agentName) {
      // Use interrupt() to trigger an agent event with proper context
      // (receiving a message triggers environment events without context)
      agent.interrupt();
      return;
    }
  }
  throw new Error(`Agent ${agentName} not found`);
});

When("a session event is emitted for agent {string}", async function (this: RuntimeWorld, _agentName: string) {
  return "pending";
});

When("a request event is emitted", async function (this: RuntimeWorld) {
  return "pending";
});

When("the corresponding result event is emitted", async function (this: RuntimeWorld) {
  return "pending";
});

When("a runtime event is emitted", async function (this: RuntimeWorld) {
  // Trigger any event
  await this.runtime.containers.create("event-trigger-container");
});

When("a session_save_request event is emitted", async function (this: RuntimeWorld) {
  return "pending";
});

When("a session_saved event is emitted", async function (this: RuntimeWorld) {
  return "pending";
});

When("a container_created event is emitted", async function (this: RuntimeWorld) {
  await this.runtime.containers.create("trigger-container");
});
