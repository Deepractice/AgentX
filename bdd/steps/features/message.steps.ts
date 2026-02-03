/**
 * Message Step Definitions
 *
 * Steps for testing Message API:
 * - sendMessage(agentId, content)
 * - interrupt(agentId)
 */

import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { AgentXWorld } from "../../support/world";

// ============================================================================
// Message Operations
// ============================================================================

/**
 * Send a text message to the saved agent
 */
When(
  "I send message {string} to the saved agent",
  async function (this: AgentXWorld, content: string) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const agentId = this.savedValues.get("agentId");
    assert.ok(agentId, 'Saved value "agentId" not found');

    this.lastResponse = await this.agentx.sendMessage(agentId, content);
  }
);

/**
 * Send a text message to a specific agent
 */
When(
  "I send message {string} to agent {string}",
  async function (this: AgentXWorld, content: string, agentId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedId = agentId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    this.lastResponse = await this.agentx.sendMessage(resolvedId, content);
  }
);

/**
 * Send a multimodal message (array content)
 */
When(
  "I send multimodal message to the saved agent:",
  async function (this: AgentXWorld, docString: string) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const agentId = this.savedValues.get("agentId");
    assert.ok(agentId, 'Saved value "agentId" not found');

    const content = JSON.parse(docString);
    this.lastResponse = await this.agentx.sendMessage(agentId, content);
  }
);

/**
 * Interrupt the saved agent
 */
When(
  "I interrupt the saved agent",
  async function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const agentId = this.savedValues.get("agentId");
    assert.ok(agentId, 'Saved value "agentId" not found');

    this.lastResponse = await this.agentx.interrupt(agentId);
  }
);

/**
 * Interrupt a specific agent
 */
When(
  "I interrupt agent {string}",
  async function (this: AgentXWorld, agentId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedId = agentId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    this.lastResponse = await this.agentx.interrupt(resolvedId);
  }
);

// ============================================================================
// Message Assertions
// ============================================================================

/**
 * Check message was sent successfully
 */
Then(
  "the message should be sent successfully",
  function (this: AgentXWorld) {
    assert.ok(this.lastResponse, "No response received");
    assert.ok(!this.lastResponse.error, `Message send failed: ${this.lastResponse.error}`);
  }
);
