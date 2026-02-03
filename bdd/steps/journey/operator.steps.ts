/**
 * Operator Journey Step Definitions
 *
 * Steps for agent management workflows:
 * - Managing multiple agents
 * - Managing images
 * - Cleanup operations
 */

import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { AgentXWorld } from "../../support/world";

// ============================================================================
// Multi-Agent Management
// ============================================================================

/**
 * Create multiple agents
 */
When(
  "I create {int} agents",
  async function (this: AgentXWorld, count: number) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const imageId = this.savedValues.get("imageId");
    assert.ok(imageId, 'Saved value "imageId" not found');

    const agentIds: string[] = [];

    for (let i = 0; i < count; i++) {
      const response = await this.agentx.createAgent({ imageId });
      agentIds.push(response.agentId);
    }

    this.savedValues.set("agentIds", agentIds.join(","));
  }
);

/**
 * Destroy all created agents
 */
When(
  "I destroy all created agents",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const agentIdsStr = this.savedValues.get("agentIds");

    if (agentIdsStr) {
      const agentIds = agentIdsStr.split(",");
      for (const agentId of agentIds) {
        await this.agentx.destroyAgent(agentId);
      }
    }

    // Also destroy the single saved agent if exists
    const singleAgentId = this.savedValues.get("agentId");
    if (singleAgentId) {
      await this.agentx.destroyAgent(singleAgentId);
    }
  }
);

/**
 * Verify number of agents
 */
Then(
  "there should be {int} running agents",
  async function (this: AgentXWorld, count: number) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const containerId = this.savedValues.get("containerId");
    assert.ok(containerId, 'Saved value "containerId" not found');

    const response = await this.agentx.listAgents(containerId);
    assert.strictEqual(
      response.agents.length,
      count,
      `Expected ${count} agents but found ${response.agents.length}`
    );
  }
);

// ============================================================================
// Image Management
// ============================================================================

/**
 * Create multiple images
 */
When(
  "I create {int} images with different configurations",
  async function (this: AgentXWorld, count: number) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const containerId = this.savedValues.get("containerId");
    assert.ok(containerId, 'Saved value "containerId" not found');

    const imageIds: string[] = [];

    for (let i = 0; i < count; i++) {
      const response = await this.agentx.createImage({
        containerId,
        name: `Agent ${i + 1}`,
        systemPrompt: `You are agent number ${i + 1}. Be helpful.`,
      });
      imageIds.push(response.record.imageId);
    }

    this.savedValues.set("imageIds", imageIds.join(","));
  }
);

/**
 * Delete all created images
 */
When(
  "I delete all created images",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const imageIdsStr = this.savedValues.get("imageIds");

    if (imageIdsStr) {
      const imageIds = imageIdsStr.split(",");
      for (const imageId of imageIds) {
        await this.agentx.deleteImage(imageId);
      }
    }

    // Also delete the single saved image if exists
    const singleImageId = this.savedValues.get("imageId");
    if (singleImageId) {
      await this.agentx.deleteImage(singleImageId);
    }
  }
);

/**
 * Verify number of images
 */
Then(
  "there should be {int} images in the container",
  async function (this: AgentXWorld, count: number) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const containerId = this.savedValues.get("containerId");
    assert.ok(containerId, 'Saved value "containerId" not found');

    const response = await this.agentx.listImages(containerId);
    assert.strictEqual(
      response.records.length,
      count,
      `Expected ${count} images but found ${response.records.length}`
    );
  }
);

// ============================================================================
// Cleanup Verification
// ============================================================================

/**
 * Verify all resources are cleaned up
 */
Then(
  "all resources should be cleaned up",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const containerId = this.savedValues.get("containerId");

    if (containerId) {
      const agents = await this.agentx.listAgents(containerId);
      assert.strictEqual(agents.agents.length, 0, "Agents not cleaned up");

      const images = await this.agentx.listImages(containerId);
      assert.strictEqual(images.records.length, 0, "Images not cleaned up");
    }
  }
);
