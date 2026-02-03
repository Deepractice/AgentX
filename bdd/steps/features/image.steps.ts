/**
 * Image Step Definitions
 *
 * Steps for testing Image API:
 * - createImage({ containerId, name?, description?, systemPrompt?, mcpServers? })
 * - getImage(imageId)
 * - listImages(containerId?)
 * - deleteImage(imageId)
 */

import { When, Then, Given } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { AgentXWorld } from "../../support/world";

// ============================================================================
// Image Operations
// ============================================================================

/**
 * Create an image with minimal params (just containerId)
 */
When(
  "I call createImage with containerId {string}",
  async function (this: AgentXWorld, containerId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedId = containerId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    this.lastResponse = await this.agentx.createImage({ containerId: resolvedId });
  }
);

/**
 * Create an image in the saved container
 */
When(
  "I call createImage in the saved container",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const containerId = this.savedValues.get("containerId");
    assert.ok(containerId, 'Saved value "containerId" not found');

    this.lastResponse = await this.agentx.createImage({ containerId });
  }
);

/**
 * Create an image with name and systemPrompt
 */
When(
  "I call createImage with name {string} and systemPrompt {string}",
  async function (this: AgentXWorld, name: string, systemPrompt: string) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const containerId = this.savedValues.get("containerId");
    assert.ok(containerId, 'Saved value "containerId" not found');

    this.lastResponse = await this.agentx.createImage({
      containerId,
      name,
      systemPrompt,
    });
  }
);

/**
 * Create an image with full configuration via data table
 */
When(
  "I call createImage with:",
  async function (this: AgentXWorld, dataTable: { rawTable: string[][] }) {
    assert.ok(this.agentx, "AgentX client not initialized");

    const params: Record<string, unknown> = {};

    for (const [key, value] of dataTable.rawTable.slice(1)) {
      // Resolve saved values in the value
      const resolved = value.replace(/\$\{(\w+)\}/g, (_, name) => {
        const saved = this.savedValues.get(name);
        assert.ok(saved, `Saved value "${name}" not found`);
        return saved;
      });
      params[key] = resolved;
    }

    this.lastResponse = await this.agentx.createImage(
      params as Parameters<typeof this.agentx.createImage>[0]
    );
  }
);

/**
 * Get an image by ID
 */
When(
  "I call getImage with id {string}",
  async function (this: AgentXWorld, imageId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedId = imageId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    this.lastResponse = await this.agentx.getImage(resolvedId);
  }
);

/**
 * Get the saved image
 */
When(
  "I call getImage with the saved imageId",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const imageId = this.savedValues.get("imageId");
    assert.ok(imageId, 'Saved value "imageId" not found');

    this.lastResponse = await this.agentx.getImage(imageId);
  }
);

/**
 * List all images
 */
When("I call listImages", async function (this: AgentXWorld) {
  assert.ok(this.agentx, "AgentX client not initialized");
  this.lastResponse = await this.agentx.listImages();
});

/**
 * List images in a container
 */
When(
  "I call listImages with containerId {string}",
  async function (this: AgentXWorld, containerId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedId = containerId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    this.lastResponse = await this.agentx.listImages(resolvedId);
  }
);

/**
 * List images in the saved container
 */
When(
  "I call listImages in the saved container",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const containerId = this.savedValues.get("containerId");
    assert.ok(containerId, 'Saved value "containerId" not found');

    this.lastResponse = await this.agentx.listImages(containerId);
  }
);

/**
 * Delete an image by ID
 */
When(
  "I call deleteImage with id {string}",
  async function (this: AgentXWorld, imageId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedId = imageId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    this.lastResponse = await this.agentx.deleteImage(resolvedId);
  }
);

/**
 * Delete the saved image
 */
When(
  "I call deleteImage with the saved imageId",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const imageId = this.savedValues.get("imageId");
    assert.ok(imageId, 'Saved value "imageId" not found');

    this.lastResponse = await this.agentx.deleteImage(imageId);
  }
);

// ============================================================================
// Image Setup Helpers (for other tests)
// ============================================================================

/**
 * Create a container and image in one step (for setup)
 */
Given(
  "I have a container and image ready",
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
      systemPrompt: "You are a helpful test assistant.",
    });

    this.savedValues.set("imageId", imageResponse.record.imageId);
    this.savedValues.set("sessionId", imageResponse.record.sessionId);
  }
);
