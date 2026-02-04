/**
 * AgentX Step Definitions
 *
 * Tests for agentxjs client SDK and @agentxjs/server
 */

import { Given, When, Then, DataTable } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { AgentXWorld } from "../support/world";
import type {
  ContainerCreateResponse,
  ContainerGetResponse,
  ContainerListResponse,
  ImageCreateResponse,
  ImageGetResponse,
  ImageListResponse,
  AgentCreateResponse,
  AgentGetResponse,
  AgentListResponse,
  MessageSendResponse,
  BaseResponse,
} from "agentxjs";

// ============================================================================
// Helper Functions
// ============================================================================

function resolvePlaceholder(world: AgentXWorld, value: string): string {
  const match = value.match(/^\{(\w+)\}$/);
  if (match) {
    const key = match[1];
    const resolved = world.savedValues.get(key);
    if (!resolved) {
      throw new Error(`Placeholder {${key}} not found in saved values`);
    }
    return resolved;
  }
  return value;
}

// ============================================================================
// Background Steps
// ============================================================================

Given("I have an AgentX client connected to the test server", async function (this: AgentXWorld) {
  const { RemoteClient } = await import("agentxjs");
  const { AgentXWorld: World } = await import("../support/world");

  const serverUrl = World.getTestServerUrl();
  this.agentx = new RemoteClient({ serverUrl });
  await (this.agentx as { connect(): Promise<void> }).connect();
});

// ============================================================================
// Container Steps
// ============================================================================

When("I create container {string}", async function (this: AgentXWorld, containerId: string) {
  const response = await this.agentx!.createContainer(containerId);
  this.lastResponse = response;
});

Given("I have created container {string}", async function (this: AgentXWorld, containerId: string) {
  await this.agentx!.createContainer(containerId);
});

When("I get container {string}", async function (this: AgentXWorld, containerId: string) {
  const response = await this.agentx!.getContainer(containerId);
  this.lastResponse = response;
});

When("I list containers", async function (this: AgentXWorld) {
  const response = await this.agentx!.listContainers();
  this.lastResponse = response;
});

Then("the response containerId should be {string}", function (this: AgentXWorld, expected: string) {
  const response = this.lastResponse as ContainerCreateResponse;
  assert.strictEqual(response.containerId, expected);
});

Then("the container should exist", function (this: AgentXWorld) {
  const response = this.lastResponse as ContainerGetResponse;
  assert.strictEqual(response.exists, true);
});

Then("the container should not exist", function (this: AgentXWorld) {
  const response = this.lastResponse as ContainerGetResponse;
  assert.strictEqual(response.exists, false);
});

Then(
  "the container list should include {string}",
  function (this: AgentXWorld, containerId: string) {
    const response = this.lastResponse as ContainerListResponse;
    assert.ok(
      response.containerIds.includes(containerId),
      `Container list should include ${containerId}`
    );
  }
);

// ============================================================================
// Image Steps
// ============================================================================

When(
  "I create image in container {string} with:",
  async function (this: AgentXWorld, containerId: string, dataTable: DataTable) {
    const data = dataTable.rowsHash();
    const response = await this.agentx!.createImage({
      containerId,
      name: data.name,
      description: data.description,
      systemPrompt: data.systemPrompt,
    });
    this.lastResponse = response;
  }
);

When(
  "I create image in container {string}",
  async function (this: AgentXWorld, containerId: string) {
    const response = await this.agentx!.createImage({ containerId });
    this.lastResponse = response;
  }
);

Given(
  "I have created an image in container {string}",
  async function (this: AgentXWorld, containerId: string) {
    const response = await this.agentx!.createImage({ containerId });
    this.lastResponse = response;
  }
);

Given(
  "I have created an image in container {string} with:",
  async function (this: AgentXWorld, containerId: string, dataTable: DataTable) {
    const data = dataTable.rowsHash();
    const response = await this.agentx!.createImage({
      containerId,
      name: data.name,
      description: data.description,
      systemPrompt: data.systemPrompt,
    });
    this.lastResponse = response;
  }
);

When("I get image {string}", async function (this: AgentXWorld, imageId: string) {
  const resolvedId = resolvePlaceholder(this, imageId);
  const response = await this.agentx!.getImage(resolvedId);
  this.lastResponse = response;
});

When(
  "I list images in container {string}",
  async function (this: AgentXWorld, containerId: string) {
    const response = await this.agentx!.listImages(containerId);
    this.lastResponse = response;
  }
);

When("I delete image {string}", async function (this: AgentXWorld, imageId: string) {
  const resolvedId = resolvePlaceholder(this, imageId);
  const response = await this.agentx!.deleteImage(resolvedId);
  this.lastResponse = response;
});

Then("the image record should have name {string}", function (this: AgentXWorld, expected: string) {
  const response = this.lastResponse as ImageCreateResponse;
  assert.strictEqual(response.record.name, expected);
});

Then("the image record should exist", function (this: AgentXWorld) {
  const response = this.lastResponse as ImageGetResponse;
  assert.ok(response.record, "Image record should exist");
});

Then("the image record should not exist", function (this: AgentXWorld) {
  const response = this.lastResponse as ImageGetResponse;
  assert.strictEqual(response.record, null, "Image record should not exist");
});

Then("the image list should include {string}", function (this: AgentXWorld, imageId: string) {
  const resolvedId = resolvePlaceholder(this, imageId);
  const response = this.lastResponse as ImageListResponse;
  const found = response.records.some((r) => r.imageId === resolvedId);
  assert.ok(found, `Image list should include ${resolvedId}`);
});

// ============================================================================
// Agent Steps
// ============================================================================

When("I create agent from image {string}", async function (this: AgentXWorld, imageId: string) {
  const resolvedId = resolvePlaceholder(this, imageId);
  const response = await this.agentx!.createAgent({ imageId: resolvedId });
  this.lastResponse = response;
});

When(
  "I create agent from image {string} with agentId {string}",
  async function (this: AgentXWorld, imageId: string, agentId: string) {
    const resolvedImageId = resolvePlaceholder(this, imageId);
    const response = await this.agentx!.createAgent({
      imageId: resolvedImageId,
      agentId,
    });
    this.lastResponse = response;
  }
);

Given(
  "I have created an agent from image {string}",
  async function (this: AgentXWorld, imageId: string) {
    const resolvedId = resolvePlaceholder(this, imageId);
    const response = await this.agentx!.createAgent({ imageId: resolvedId });
    this.lastResponse = response;
  }
);

When("I get agent {string}", async function (this: AgentXWorld, agentId: string) {
  const resolvedId = resolvePlaceholder(this, agentId);
  const response = await this.agentx!.getAgent(resolvedId);
  this.lastResponse = response;
});

When("I list agents", async function (this: AgentXWorld) {
  const response = await this.agentx!.listAgents();
  this.lastResponse = response;
});

When("I destroy agent {string}", async function (this: AgentXWorld, agentId: string) {
  const resolvedId = resolvePlaceholder(this, agentId);
  const response = await this.agentx!.destroyAgent(resolvedId);
  this.lastResponse = response;
});

Then("the agent response should have agentId", function (this: AgentXWorld) {
  const response = this.lastResponse as AgentCreateResponse;
  assert.ok(response.agentId, "Agent response should have agentId");
});

Then("the agent response should have sessionId", function (this: AgentXWorld) {
  const response = this.lastResponse as AgentCreateResponse;
  assert.ok(response.sessionId, "Agent response should have sessionId");
});

Then(
  "the agent response agentId should be {string}",
  function (this: AgentXWorld, expected: string) {
    const response = this.lastResponse as AgentCreateResponse;
    assert.strictEqual(response.agentId, expected);
  }
);

Then("the agent should exist", function (this: AgentXWorld) {
  const response = this.lastResponse as AgentGetResponse;
  assert.strictEqual(response.exists, true, "Agent should exist");
});

Then("the agent should not exist", function (this: AgentXWorld) {
  const response = this.lastResponse as AgentGetResponse;
  assert.strictEqual(response.exists, false, "Agent should not exist");
});

Then("the agent list should include {string}", function (this: AgentXWorld, agentId: string) {
  const resolvedId = resolvePlaceholder(this, agentId);
  const response = this.lastResponse as AgentListResponse;
  const found = response.agents.some((a) => a.agentId === resolvedId);
  assert.ok(found, `Agent list should include ${resolvedId}`);
});

// ============================================================================
// Message Steps
// ============================================================================

When(
  "I send message {string} to agent {string}",
  { timeout: 60000 },
  async function (this: AgentXWorld, content: string, agentId: string) {
    const resolvedAgentId = resolvePlaceholder(this, agentId);
    const response = await this.agentx!.sendMessage(resolvedAgentId, content);
    this.lastResponse = response;
  }
);

When("I interrupt agent {string}", async function (this: AgentXWorld, agentId: string) {
  const resolvedId = resolvePlaceholder(this, agentId);
  const response = await this.agentx!.interrupt(resolvedId);
  this.lastResponse = response;
});

// ============================================================================
// Event Subscription Steps
// ============================================================================

Given("I subscribe to all events", function (this: AgentXWorld) {
  this.subscribeToAllEvents();
});

Given("I subscribe to {string} events", function (this: AgentXWorld, eventType: string) {
  this.subscribeToEvent(eventType);
});

Then(
  "I should receive {string} event within {int} seconds",
  { timeout: 60000 },
  async function (this: AgentXWorld, eventType: string, seconds: number) {
    await this.waitForEvent(eventType, seconds * 1000);
  }
);

Then("I should receive {string} events", function (this: AgentXWorld, eventType: string) {
  const events = this.getEventsOfType(eventType);
  assert.ok(events.length > 0, `Should have received ${eventType} events`);
});

Then("I should have collected {string} events", function (this: AgentXWorld, eventType: string) {
  const events = this.getEventsOfType(eventType);
  assert.ok(events.length > 0, `Should have collected ${eventType} events`);
});

Then("the combined text_delta content should not be empty", function (this: AgentXWorld) {
  const events = this.getEventsOfType("text_delta");
  const combined = events.map((e) => (e.data as { text?: string }).text || "").join("");
  assert.ok(combined.length > 0, "Combined text_delta content should not be empty");
});

Then(
  "the {string} event should have context.agentId",
  function (this: AgentXWorld, eventType: string) {
    const events = this.getEventsOfType(eventType);
    assert.ok(events.length > 0, `Should have ${eventType} events`);
    const event = events[0];
    assert.ok(event.context?.agentId, "Event should have context.agentId");
  }
);

Then(
  "the {string} event should have context.sessionId",
  function (this: AgentXWorld, eventType: string) {
    const events = this.getEventsOfType(eventType);
    assert.ok(events.length > 0, `Should have ${eventType} events`);
    const event = events[0];
    assert.ok(event.context?.sessionId, "Event should have context.sessionId");
  }
);

When("I wait for {int} second(s)", async function (this: AgentXWorld, seconds: number) {
  await new Promise((r) => setTimeout(r, seconds * 1000));
});

// ============================================================================
// Common Steps
// ============================================================================

Then("the response should be successful", function (this: AgentXWorld) {
  assert.ok(this.lastResponse, "Should have a response");
  assert.ok(!this.lastResponse.error, `Response should not have error: ${this.lastResponse.error}`);
});

Given("I save the imageId as {string}", function (this: AgentXWorld, key: string) {
  const response = this.lastResponse as ImageCreateResponse;
  assert.ok(response.record?.imageId, "Response should have imageId");
  this.savedValues.set(key, response.record.imageId);
});

Given("I save the agentId as {string}", function (this: AgentXWorld, key: string) {
  const response = this.lastResponse as AgentCreateResponse;
  assert.ok(response.agentId, "Response should have agentId");
  this.savedValues.set(key, response.agentId);
});

// ============================================================================
// Presentation Steps
// ============================================================================

Given(
  "I create a presentation for agent {string}",
  function (this: AgentXWorld, agentId: string) {
    const resolvedId = resolvePlaceholder(this, agentId);
    this.presentationStates = [];
    this.presentationComplete = false;
    this.presentationDisposed = false;

    this.presentation = this.agentx!.presentation(resolvedId, {
      onUpdate: (state) => {
        this.presentationStates.push({ ...state });
        // Check if complete (no streaming and status is idle after user message)
        if (state.streaming === null && state.status === "idle" && state.conversations.length > 1) {
          this.presentationComplete = true;
        }
      },
    });
  }
);

When(
  "I send {string} via presentation",
  { timeout: 60000 },
  async function (this: AgentXWorld, content: string) {
    assert.ok(this.presentation, "Presentation should be created first");
    this.presentationComplete = false;
    await this.presentation.send(content);
  }
);

When(
  "I wait for presentation to complete within {int} seconds",
  { timeout: 60000 },
  async function (this: AgentXWorld, seconds: number) {
    const timeout = seconds * 1000;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (this.presentationComplete) {
        return;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    throw new Error(`Presentation did not complete within ${seconds} seconds`);
  }
);

When("I reset the presentation", function (this: AgentXWorld) {
  assert.ok(this.presentation, "Presentation should exist");
  this.presentation.reset();
  this.presentationStates = [];
});

When("I dispose the presentation", function (this: AgentXWorld) {
  assert.ok(this.presentation, "Presentation should exist");
  this.presentation.dispose();
  this.presentationDisposed = true;
});

Then("the presentation state should have empty conversations", function (this: AgentXWorld) {
  assert.ok(this.presentation, "Presentation should exist");
  const state = this.presentation.getState();
  assert.strictEqual(state.conversations.length, 0, "Conversations should be empty");
});

Then("the presentation status should be {string}", function (this: AgentXWorld, expected: string) {
  assert.ok(this.presentation, "Presentation should exist");
  const state = this.presentation.getState();
  assert.strictEqual(state.status, expected, `Status should be ${expected}`);
});

Then("the presentation should have {int} conversation(s)", function (this: AgentXWorld, count: number) {
  assert.ok(this.presentation, "Presentation should exist");
  const state = this.presentation.getState();
  assert.strictEqual(state.conversations.length, count, `Should have ${count} conversations`);
});

Then(
  "the first conversation should be from {string}",
  function (this: AgentXWorld, role: string) {
    assert.ok(this.presentation, "Presentation should exist");
    const state = this.presentation.getState();
    assert.ok(state.conversations.length > 0, "Should have at least one conversation");
    assert.strictEqual(state.conversations[0].role, role, `First conversation should be from ${role}`);
  }
);

Then(
  "the first conversation should contain text {string}",
  function (this: AgentXWorld, text: string) {
    assert.ok(this.presentation, "Presentation should exist");
    const state = this.presentation.getState();
    assert.ok(state.conversations.length > 0, "Should have at least one conversation");

    const conv = state.conversations[0];
    if (conv.role === "user" || conv.role === "assistant") {
      const hasText = conv.blocks.some(
        (block) => block.type === "text" && block.content.includes(text)
      );
      assert.ok(hasText, `Conversation should contain text "${text}"`);
    } else {
      throw new Error(`Unexpected conversation role: ${conv.role}`);
    }
  }
);

Then(
  "the second conversation should be from {string}",
  function (this: AgentXWorld, role: string) {
    assert.ok(this.presentation, "Presentation should exist");
    const state = this.presentation.getState();
    assert.ok(state.conversations.length > 1, "Should have at least two conversations");
    assert.strictEqual(state.conversations[1].role, role, `Second conversation should be from ${role}`);
  }
);

Then("the second conversation should have blocks", function (this: AgentXWorld) {
  assert.ok(this.presentation, "Presentation should exist");
  const state = this.presentation.getState();
  assert.ok(state.conversations.length > 1, "Should have at least two conversations");

  const conv = state.conversations[1];
  if (conv.role === "assistant") {
    assert.ok(conv.blocks.length > 0, "Assistant conversation should have blocks");
  } else {
    throw new Error(`Expected assistant conversation, got ${conv.role}`);
  }
});

Then("the presentation streaming should not be null during response", function (this: AgentXWorld) {
  // Check if we captured a state where streaming was not null
  const hasStreaming = this.presentationStates.some((state) => state.streaming !== null);
  assert.ok(hasStreaming, "Should have captured streaming state during response");
});

Then(
  "the presentation status should be {string} during response",
  function (this: AgentXWorld, expected: string) {
    // Check if we captured a state with the expected status
    const hasStatus = this.presentationStates.some((state) => state.status === expected);
    assert.ok(hasStatus, `Should have captured status "${expected}" during response`);
  }
);

Then("the presentation streaming should be null", function (this: AgentXWorld) {
  assert.ok(this.presentation, "Presentation should exist");
  const state = this.presentation.getState();
  assert.strictEqual(state.streaming, null, "Streaming should be null");
});

Then("the assistant conversation should have a text block", function (this: AgentXWorld) {
  assert.ok(this.presentation, "Presentation should exist");
  const state = this.presentation.getState();

  const assistantConv = state.conversations.find((c) => c.role === "assistant");
  assert.ok(assistantConv, "Should have an assistant conversation");
  assert.ok(assistantConv.role === "assistant", "Should be assistant role");

  const textBlock = assistantConv.blocks.find((b) => b.type === "text");
  assert.ok(textBlock, "Assistant conversation should have a text block");
});

Then("the text block content should not be empty", function (this: AgentXWorld) {
  assert.ok(this.presentation, "Presentation should exist");
  const state = this.presentation.getState();

  const assistantConv = state.conversations.find((c) => c.role === "assistant");
  assert.ok(assistantConv && assistantConv.role === "assistant", "Should have an assistant conversation");

  const textBlock = assistantConv.blocks.find((b) => b.type === "text");
  assert.ok(textBlock && textBlock.type === "text", "Should have a text block");
  assert.ok(textBlock.content.length > 0, "Text block content should not be empty");
});

Then("the presentation should be disposed", function (this: AgentXWorld) {
  assert.ok(this.presentationDisposed, "Presentation should be disposed");
});
