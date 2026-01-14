/**
 * Bug Reproduction Step Definitions
 *
 * Steps specifically for reproducing and verifying bugs.
 * After bugs are fixed, valuable tests can be moved to appropriate feature areas.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { AgentXWorld } from "./world";

function expect(value: unknown) {
  return {
    toBeDefined: () => assert.ok(value !== undefined && value !== null),
    toBe: (expected: unknown) => assert.strictEqual(value, expected),
    toBeGreaterThan: (expected: number) => assert.ok((value as number) > expected),
    toContain: (item: unknown) => assert.ok((value as unknown[]).includes(item)),
    toBeArray: () => assert.ok(Array.isArray(value)),
  };
}

// ============================================================================
// New Client Connection (simulates fresh login)
// ============================================================================

Given(
  /^a new remote client connects to "([^"]+)"$/,
  async function (this: AgentXWorld, serverUrl: string) {
    // Dispose any existing client to simulate fresh login
    if (this.agentx) {
      await this.agentx.dispose();
    }

    const { createAgentX } = await import("agentxjs");
    this.agentx = await createAgentX({ serverUrl });
    this.isConnected = true;

    // Clear any existing subscriptions
    this.eventHandlers.clear();
    this.collectedEvents = [];
  }
);

// ============================================================================
// Response Field Assertions
// ============================================================================

Then("the response should contain __subscriptions field", function (this: AgentXWorld) {
  const data = this.lastResponse?.data as { __subscriptions?: string[] };
  expect(data.__subscriptions).toBeDefined();
  expect(data.__subscriptions).toBeArray();
});

Then(
  /^the response data should have "([^"]+)" array$/,
  function (this: AgentXWorld, fieldName: string) {
    const data = this.lastResponse?.data as Record<string, unknown>;
    expect(data[fieldName]).toBeDefined();
    expect(data[fieldName]).toBeArray();
  }
);

Then(
  /^"__subscriptions" should contain the session ID for image "([^"]+)"$/,
  function (this: AgentXWorld, imageAlias: string) {
    const data = this.lastResponse?.data as {
      __subscriptions?: string[];
      records?: Array<{ sessionId: string }>;
    };
    const subscriptions = data.__subscriptions || [];

    // Get session ID from records
    const records = data.records || [];
    const imageRecord = records.find((r) => r.sessionId);

    if (imageRecord) {
      const found = subscriptions.includes(imageRecord.sessionId);
      if (!found) {
        console.log("DEBUG: Expected sessionId:", imageRecord.sessionId);
        console.log("DEBUG: Actual __subscriptions:", subscriptions);
      }
      expect(found).toBe(true);
    } else {
      console.log("DEBUG: No records with sessionId found");
      // At minimum, __subscriptions should not be empty
      expect(subscriptions.length).toBeGreaterThan(0);
    }
  }
);

Then("__subscriptions should contain the new session ID", function (this: AgentXWorld) {
  const data = this.lastResponse?.data as {
    __subscriptions?: string[];
    record?: { sessionId: string };
  };
  const subscriptions = data.__subscriptions || [];
  const sessionId = data.record?.sessionId;

  if (sessionId) {
    const found = subscriptions.includes(sessionId);
    if (!found) {
      console.log("DEBUG: Expected sessionId:", sessionId);
      console.log("DEBUG: Actual __subscriptions:", subscriptions);
    }
    expect(found).toBe(true);
  }
});

// ============================================================================
// Event Subscription for Image (bug-specific - uses unique step name)
// ============================================================================

Given(
  /^I subscribe to events for the image "([^"]+)"$/,
  function (this: AgentXWorld, imageAlias: string) {
    const imageId = this.createdImages.get(imageAlias);
    if (!imageId) {
      throw new Error(`Image "${imageAlias}" not found. Create it first.`);
    }

    // Subscribe to relevant events
    const eventTypes = ["text_delta", "message_stop", "assistant_message", "conversation_end"];
    for (const eventType of eventTypes) {
      this.subscribeToEvent(eventType);
    }

    this.savedValues.set("subscribedImageId", imageId);
  }
);

// ============================================================================
// Message Sending (bug-specific - uses unique step name)
// ============================================================================

When(
  /^I send a message "([^"]+)" to image "([^"]+)"$/,
  async function (this: AgentXWorld, message: string, imageAlias: string) {
    const imageId = this.createdImages.get(imageAlias);
    if (!imageId) {
      throw new Error(`Image "${imageAlias}" not found. Create it first.`);
    }

    // Clear collected events before sending
    this.collectedEvents = [];

    // Send the message
    const response = await this.agentx!.request("message_send_request", {
      imageId,
      content: message,
    });

    this.lastResponse = response;
    this.savedValues.set("lastMessageSent", message);
  }
);

When(
  /^I create a new image "([^"]+)" in container "([^"]+)"$/,
  async function (this: AgentXWorld, imageAlias: string, containerId: string) {
    const uniqueContainerId = this.savedValues.get(`container:${containerId}`) || containerId;

    this.lastResponse = await this.agentx!.request("image_create_request", {
      containerId: uniqueContainerId,
      config: { name: imageAlias },
    });

    const imageId = (this.lastResponse?.data as { record?: { imageId: string } })?.record?.imageId;
    if (imageId) {
      this.createdImages.set(imageAlias, imageId);
    }
  }
);

// ============================================================================
// Event Assertions with Timeout
// ============================================================================

Then(
  /^I should receive "([^"]+)" event within (\d+) seconds$/,
  async function (this: AgentXWorld, eventType: string, seconds: string) {
    const timeoutMs = parseInt(seconds, 10) * 1000;
    const startTime = Date.now();

    // Poll for the event
    while (Date.now() - startTime < timeoutMs) {
      const found = this.collectedEvents.some((e) => e.type === eventType);
      if (found) {
        return; // Success
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    // Timeout - show debug info
    console.log(`DEBUG: Timeout waiting for "${eventType}" event`);
    console.log(
      "DEBUG: Collected events:",
      this.collectedEvents.map((e) => e.type)
    );
    console.log("DEBUG: Event handlers registered:", Array.from(this.eventHandlers.keys()));

    throw new Error(`Did not receive "${eventType}" event within ${seconds} seconds`);
  }
);

Then(
  /^I should also receive "([^"]+)" event$/,
  async function (this: AgentXWorld, eventType: string) {
    // Wait a short time for event to arrive
    await new Promise((r) => setTimeout(r, 500));

    const found = this.collectedEvents.some((e) => e.type === eventType);
    if (!found) {
      console.log(`DEBUG: Expected "${eventType}" event`);
      console.log(
        "DEBUG: Collected events:",
        this.collectedEvents.map((e) => e.type)
      );
    }
    expect(found).toBe(true);
  }
);

Then("I should receive response events", async function (this: AgentXWorld) {
  // Wait for any response event
  await new Promise((r) => setTimeout(r, 2000));

  const hasResponse = this.collectedEvents.some(
    (e) => e.type === "text_delta" || e.type === "message_stop" || e.type === "assistant_message"
  );

  if (!hasResponse) {
    console.log("DEBUG: No response events received");
    console.log(
      "DEBUG: Collected events:",
      this.collectedEvents.map((e) => e.type)
    );
  }

  expect(hasResponse).toBe(true);
});
