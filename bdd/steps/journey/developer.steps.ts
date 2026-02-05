/**
 * Journey Steps - Developer Persona
 *
 * End-to-end workflows for developers using the AgentX SDK.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { AgentXWorld } from "../../support/world";
import type { BusEvent } from "@agentxjs/core/event";

// ============================================================================
// State for developer journey
// ============================================================================

interface DeveloperState {
  containerId?: string;
  imageId?: string;
  agentId?: string;
  sessionId?: string;
  events: BusEvent[];
  unsubscribes: Array<() => void>;
}

const KEY = "__developer";

function getState(world: AgentXWorld): DeveloperState {
  if (!(world as any)[KEY]) {
    (world as any)[KEY] = { events: [], unsubscribes: [] };
  }
  return (world as any)[KEY];
}

// ============================================================================
// Phase 1: Initialize
// ============================================================================

Given(
  "a local AgentX environment with provider {string}",
  { timeout: 30000 },
  async function (this: AgentXWorld, provider: string) {
    const { createAgentX } = await import("agentxjs");

    const apiKey =
      process.env.ANTHROPIC_API_KEY ||
      process.env.DEEPRACTICE_API_KEY ||
      "test-key";
    const baseUrl = process.env.DEEPRACTICE_BASE_URL;
    const model = process.env.DEEPRACTICE_MODEL || "claude-haiku-4-5-20251001";

    this.localAgentX = await createAgentX({
      apiKey,
      provider: provider as any,
      model,
      baseUrl,
      dataPath: ":memory:",
    });
  }
);

// ============================================================================
// Phase 2: Create resources
// ============================================================================

When(
  "I create a container {string}",
  async function (this: AgentXWorld, containerId: string) {
    const result = await this.localAgentX!.containers.create(containerId);
    getState(this).containerId = result.containerId;
  }
);

Then(
  "the container {string} should exist",
  async function (this: AgentXWorld, containerId: string) {
    const result = await this.localAgentX!.containers.get(containerId);
    assert.ok(result.exists, `Container "${containerId}" should exist`);
  }
);

When(
  "I create an image {string} in {string} with prompt {string}",
  async function (
    this: AgentXWorld,
    name: string,
    containerId: string,
    systemPrompt: string
  ) {
    const result = await this.localAgentX!.images.create({
      containerId,
      name,
      systemPrompt,
    });
    const state = getState(this);
    state.imageId = result.record.imageId;
    state.sessionId = result.record.sessionId;
  }
);

Then(
  "the image should be created with a valid ID",
  function (this: AgentXWorld) {
    const state = getState(this);
    assert.ok(state.imageId, "Image should have an imageId");
    assert.ok(
      state.imageId!.startsWith("img_"),
      `imageId should start with img_, got: ${state.imageId}`
    );
  }
);

// ============================================================================
// Phase 3: Run agent
// ============================================================================

When(
  "I run the image as an agent",
  { timeout: 30000 },
  async function (this: AgentXWorld) {
    const state = getState(this);
    const result = await this.localAgentX!.agents.create({
      imageId: state.imageId!,
    });
    state.agentId = result.agentId;
  }
);

Then("the agent should be running", async function (this: AgentXWorld) {
  const state = getState(this);
  const result = await this.localAgentX!.agents.get(state.agentId!);
  assert.ok(result.exists, "Agent should exist");
});

// ============================================================================
// Phase 4: Conversation
// ============================================================================

When("I start listening for events", function (this: AgentXWorld) {
  const state = getState(this);
  state.events = [];
  const unsub = this.localAgentX!.onAny((event) => {
    state.events.push(event);
  });
  state.unsubscribes.push(unsub);
});

When(
  "I send message {string}",
  { timeout: 30000 },
  async function (this: AgentXWorld, message: string) {
    const state = getState(this);
    await this.localAgentX!.sessions.send(state.agentId!, message);
    // Wait briefly for events to propagate
    await new Promise((r) => setTimeout(r, 200));
  }
);

Then(
  "I should receive the complete event stream",
  function (this: AgentXWorld) {
    const state = getState(this);
    const types = state.events.map((e) => e.type);

    assert.ok(
      types.includes("message_start"),
      `Should have message_start, got: [${types.join(", ")}]`
    );
    assert.ok(
      types.includes("text_delta"),
      `Should have text_delta, got: [${types.join(", ")}]`
    );
    assert.ok(
      types.includes("message_stop"),
      `Should have message_stop, got: [${types.join(", ")}]`
    );

    // Verify correct order: message_start before text_delta before message_stop
    const startIdx = types.indexOf("message_start");
    const deltaIdx = types.indexOf("text_delta");
    const stopIdx = types.lastIndexOf("message_stop");
    assert.ok(startIdx < deltaIdx, "message_start should come before text_delta");
    assert.ok(deltaIdx < stopIdx, "text_delta should come before message_stop");
  }
);

Then(
  "the response should contain non-empty text",
  function (this: AgentXWorld) {
    const state = getState(this);
    const textDeltas = state.events.filter((e) => e.type === "text_delta");
    const fullText = textDeltas.map((e) => (e.data as any).text).join("");
    assert.ok(fullText.length > 0, "Response text should not be empty");
  }
);

// ============================================================================
// Phase 5: Cleanup
// ============================================================================

When("I destroy the agent", async function (this: AgentXWorld) {
  const state = getState(this);
  // Unsubscribe event handlers first
  for (const unsub of state.unsubscribes) {
    unsub();
  }
  state.unsubscribes = [];

  await this.localAgentX!.agents.destroy(state.agentId!);
});

Then(
  "the agent should no longer exist",
  async function (this: AgentXWorld) {
    const state = getState(this);
    const result = await this.localAgentX!.agents.get(state.agentId!);
    assert.ok(!result.exists, "Agent should no longer exist");
  }
);
