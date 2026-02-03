/**
 * Developer Journey Step Definitions
 *
 * Steps for end-to-end developer workflows:
 * - First conversation flow
 * - Multimodal conversation
 * - Tool use conversation
 */

import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { AgentXWorld } from "../../support/world";

// ============================================================================
// Conversation Flow Steps
// ============================================================================

/**
 * Complete first conversation workflow in one step
 */
When(
  "I complete the first conversation workflow",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Step 1: Create container
    const containerId = `container_${this.scenarioId}`;
    await this.agentx.createContainer(containerId);
    this.savedValues.set("containerId", containerId);

    // Step 2: Create image
    const imageResponse = await this.agentx.createImage({
      containerId,
      name: "First Assistant",
      systemPrompt: "You are a helpful assistant. Keep responses brief.",
    });
    this.savedValues.set("imageId", imageResponse.record.imageId);
    this.savedValues.set("sessionId", imageResponse.record.sessionId);

    // Step 3: Subscribe to events
    this.subscribeToAllEvents();

    // Step 4: Create agent
    const agentResponse = await this.agentx.createAgent({
      imageId: imageResponse.record.imageId,
    });
    this.savedValues.set("agentId", agentResponse.agentId);

    // Step 5: Send message
    await this.agentx.sendMessage(agentResponse.agentId, "Hello!");

    // Step 6: Wait for response
    await this.waitForEvent("assistant_message", 15000);
  }
);

/**
 * Start a new conversation with the agent
 */
When(
  "I start a conversation with {string}",
  async function (this: AgentXWorld, message: string) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const agentId = this.savedValues.get("agentId");
    assert.ok(agentId, 'Saved value "agentId" not found');

    this.clearEvents();
    await this.agentx.sendMessage(agentId, message);
  }
);

/**
 * Continue the conversation
 */
When(
  "I continue the conversation with {string}",
  async function (this: AgentXWorld, message: string) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const agentId = this.savedValues.get("agentId");
    assert.ok(agentId, 'Saved value "agentId" not found');

    await this.agentx.sendMessage(agentId, message);
  }
);

/**
 * Wait for complete response
 */
Then(
  "I should receive a complete response",
  async function (this: AgentXWorld) {
    await this.waitForEvent("assistant_message", 15000);
  }
);

/**
 * Clean up after conversation
 */
When(
  "I clean up the conversation",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const agentId = this.savedValues.get("agentId");

    if (agentId) {
      await this.agentx.destroyAgent(agentId);
    }
  }
);

// ============================================================================
// Verification Steps
// ============================================================================

/**
 * Verify container was created
 */
Then(
  "the container should be created",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const containerId = this.savedValues.get("containerId");
    assert.ok(containerId, "Container ID not saved");

    const response = await this.agentx.getContainer(containerId);
    assert.ok(response.exists, "Container was not created");
  }
);

/**
 * Verify image was created
 */
Then(
  "the image should be created",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const imageId = this.savedValues.get("imageId");
    assert.ok(imageId, "Image ID not saved");

    const response = await this.agentx.getImage(imageId);
    assert.ok(response.record, "Image was not created");
  }
);

/**
 * Verify agent is running
 */
Then(
  "the agent should be running",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const agentId = this.savedValues.get("agentId");
    assert.ok(agentId, "Agent ID not saved");

    const response = await this.agentx.getAgent(agentId);
    assert.ok(response.exists, "Agent is not running");
  }
);

/**
 * Verify agent is destroyed
 */
Then(
  "the agent should be destroyed",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const agentId = this.savedValues.get("agentId");
    assert.ok(agentId, "Agent ID not saved");

    const response = await this.agentx.getAgent(agentId);
    assert.ok(!response.exists, "Agent is still running");
  }
);
