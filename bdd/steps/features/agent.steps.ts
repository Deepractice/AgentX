/**
 * Agent Step Definitions
 *
 * Steps for testing Agent API:
 * - createAgent({ imageId, agentId? })
 * - getAgent(agentId)
 * - listAgents(containerId?)
 * - destroyAgent(agentId)
 */

import { When, Then, Given } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { AgentXWorld } from "../../support/world";

// ============================================================================
// Agent Operations
// ============================================================================

/**
 * Create an agent from the saved image
 */
When(
  "I call createAgent with the saved imageId",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const imageId = this.savedValues.get("imageId");
    assert.ok(imageId, 'Saved value "imageId" not found');

    this.lastResponse = await this.agentx.createAgent({ imageId });
  }
);

/**
 * Create an agent with specific imageId
 */
When(
  "I call createAgent with imageId {string}",
  async function (this: AgentXWorld, imageId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedId = imageId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    this.lastResponse = await this.agentx.createAgent({ imageId: resolvedId });
  }
);

/**
 * Create an agent with custom agentId
 */
When(
  "I call createAgent with imageId {string} and agentId {string}",
  async function (this: AgentXWorld, imageId: string, agentId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedImageId = imageId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    const resolvedAgentId = agentId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    this.lastResponse = await this.agentx.createAgent({
      imageId: resolvedImageId,
      agentId: resolvedAgentId,
    });
  }
);

/**
 * Get an agent by ID
 */
When(
  "I call getAgent with id {string}",
  async function (this: AgentXWorld, agentId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedId = agentId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    this.lastResponse = await this.agentx.getAgent(resolvedId);
  }
);

/**
 * Get the saved agent
 */
When(
  "I call getAgent with the saved agentId",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const agentId = this.savedValues.get("agentId");
    assert.ok(agentId, 'Saved value "agentId" not found');

    this.lastResponse = await this.agentx.getAgent(agentId);
  }
);

/**
 * List all agents
 */
When("I call listAgents", async function (this: AgentXWorld) {
  assert.ok(this.agentx, "AgentX client not initialized");
  this.lastResponse = await this.agentx.listAgents();
});

/**
 * List agents in a container
 */
When(
  "I call listAgents with containerId {string}",
  async function (this: AgentXWorld, containerId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedId = containerId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    this.lastResponse = await this.agentx.listAgents(resolvedId);
  }
);

/**
 * List agents in the saved container
 */
When(
  "I call listAgents in the saved container",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const containerId = this.savedValues.get("containerId");
    assert.ok(containerId, 'Saved value "containerId" not found');

    this.lastResponse = await this.agentx.listAgents(containerId);
  }
);

/**
 * Destroy an agent by ID
 */
When(
  "I call destroyAgent with id {string}",
  async function (this: AgentXWorld, agentId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedId = agentId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    this.lastResponse = await this.agentx.destroyAgent(resolvedId);
  }
);

/**
 * Destroy the saved agent
 */
When(
  "I call destroyAgent with the saved agentId",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const agentId = this.savedValues.get("agentId");
    assert.ok(agentId, 'Saved value "agentId" not found');

    this.lastResponse = await this.agentx.destroyAgent(agentId);
  }
);

// ============================================================================
// Agent Setup Helpers (for other tests)
// ============================================================================

/**
 * Create a container, image, and agent in one step (for setup)
 */
Given(
  "I have a running agent ready",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Create container
    const containerId = `container_${this.scenarioId}`;
    await this.agentx.createContainer(containerId);
    this.savedValues.set("containerId", containerId);

    // Create image
    const imageResponse = await this.agentx.createImage({
      containerId,
      name: "Test Assistant",
      systemPrompt: "You are a helpful test assistant. Always respond briefly.",
    });

    this.savedValues.set("imageId", imageResponse.record.imageId);
    this.savedValues.set("sessionId", imageResponse.record.sessionId);

    // Create agent
    const agentResponse = await this.agentx.createAgent({
      imageId: imageResponse.record.imageId,
    });

    this.savedValues.set("agentId", agentResponse.agentId);
  }
);

/**
 * Check agent exists
 */
Then(
  "the agent {string} should exist",
  async function (this: AgentXWorld, agentId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedId = agentId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    const response = await this.agentx.getAgent(resolvedId);
    assert.ok(response.exists, `Agent "${resolvedId}" does not exist`);
  }
);

/**
 * Check agent does not exist
 */
Then(
  "the agent {string} should not exist",
  async function (this: AgentXWorld, agentId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedId = agentId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    const response = await this.agentx.getAgent(resolvedId);
    assert.ok(!response.exists, `Agent "${resolvedId}" exists but should not`);
  }
);
