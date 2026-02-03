/**
 * Container Step Definitions
 *
 * Steps for testing Container API:
 * - createContainer(containerId)
 * - getContainer(containerId)
 * - listContainers()
 */

import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { AgentXWorld } from "../../support/world";

// ============================================================================
// Container Operations
// ============================================================================

/**
 * Create a container
 */
When(
  "I call createContainer with id {string}",
  async function (this: AgentXWorld, containerId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedId = containerId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    this.lastResponse = await this.agentx.createContainer(resolvedId);
  }
);

/**
 * Create a container with scenario-unique ID
 */
When(
  "I call createContainer with a unique id",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const containerId = `container_${this.scenarioId}`;
    this.lastResponse = await this.agentx.createContainer(containerId);
    this.savedValues.set("containerId", containerId);
  }
);

/**
 * Get a container
 */
When(
  "I call getContainer with id {string}",
  async function (this: AgentXWorld, containerId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedId = containerId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    this.lastResponse = await this.agentx.getContainer(resolvedId);
  }
);

/**
 * List all containers
 */
When("I call listContainers", async function (this: AgentXWorld) {
  assert.ok(this.agentx, "AgentX client not initialized");
  const response = await this.agentx.listContainers();
  console.log("[DEBUG] listContainers response:", JSON.stringify(response, null, 2));
  this.lastResponse = response;
});

// ============================================================================
// Container Assertions
// ============================================================================

/**
 * Check container exists
 */
Then(
  "the container {string} should exist",
  async function (this: AgentXWorld, containerId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedId = containerId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    const response = await this.agentx.getContainer(resolvedId);
    assert.ok(response.exists, `Container "${resolvedId}" does not exist`);
  }
);

/**
 * Check container does not exist
 */
Then(
  "the container {string} should not exist",
  async function (this: AgentXWorld, containerId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedId = containerId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    const response = await this.agentx.getContainer(resolvedId);
    assert.ok(!response.exists, `Container "${resolvedId}" exists but should not`);
  }
);

/**
 * Check containers list includes container
 */
Then(
  "the containers list should include {string}",
  async function (this: AgentXWorld, containerId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedId = containerId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    const response = await this.agentx.listContainers();
    assert.ok(
      response.containerIds.includes(resolvedId),
      `Containers list does not include "${resolvedId}"`
    );
  }
);
