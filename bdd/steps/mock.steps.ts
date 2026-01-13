/**
 * Mock Environment Step Definitions
 */

import { Given, When, Then, DataTable } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { AgentXWorld } from "./world";

function expect(value: unknown) {
  return {
    toBe: (expected: unknown) => assert.strictEqual(value, expected),
    toEqual: (expected: unknown) => assert.deepStrictEqual(value, expected),
    toContain: (item: unknown) => assert.ok((value as unknown[]).includes(item)),
    toBeGreaterThan: (expected: number) => assert.ok((value as number) > expected),
  };
}

// ============================================================================
// Mock Setup
// ============================================================================

Given("an AgentX instance with mock environment", async function (this: AgentXWorld) {
  await this.createMockAgentX();
});

Given(/^mock scenario is "([^"]+)"$/, function (this: AgentXWorld, scenario: string) {
  this.setMockScenario(scenario);
});

// ============================================================================
// Event Order Verification
// ============================================================================

Then("I should receive events in order:", function (this: AgentXWorld, dataTable: DataTable) {
  const expectedTypes = dataTable.raw().map((row) => row[0]);
  const actualTypes = this.collectedEvents.map((e) => e.type);
  expect(actualTypes).toEqual(expectedTypes);
});

Then(
  /^I should receive exactly (\d+) "([^"]+)" events$/,
  async function (this: AgentXWorld, count: string, eventType: string) {
    // Wait for mock events to arrive (with delays)
    const expectedCount = parseInt(count, 10);
    const maxWait = 5000;
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      const events = this.collectedEvents.filter((e) => e.type === eventType);
      if (events.length >= expectedCount) {
        expect(events.length).toBe(expectedCount);
        return;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    // Timeout
    const actualCount = this.collectedEvents.filter((e) => e.type === eventType).length;
    expect(actualCount).toBe(expectedCount);
  }
);

// ============================================================================
// Text Content Verification
// ============================================================================

Then(/^text should be "([^"]+)"$/, function (this: AgentXWorld, expectedText: string) {
  const textDeltas = this.collectedEvents.filter((e) => e.type === "text_delta");
  const fullText = textDeltas.map((e) => (e.data as { text: string }).text).join("");
  expect(fullText).toBe(expectedText);
});

Then(/^text should contain "([^"]+)"$/, function (this: AgentXWorld, substring: string) {
  const textDeltas = this.collectedEvents.filter((e) => e.type === "text_delta");
  const fullText = textDeltas.map((e) => (e.data as { text: string }).text).join("");
  expect(fullText).toContain(substring);
});

Then("I should receive text deltas", function (this: AgentXWorld) {
  const textDeltas = this.collectedEvents.filter((e) => e.type === "text_delta");
  expect(textDeltas.length).toBeGreaterThan(0);
});

// ============================================================================
// Reliability Testing Steps
// ============================================================================

Given(/^server mock scenario is "([^"]+)"$/, function (this: AgentXWorld, _scenario: string) {
  // Server already has MockEnvironment configured
  // Scenario is set via test-server environment
  expect(true).toBe(true);
});

Given(
  /^a remote client connected to "([^"]+)"$/,
  async function (this: AgentXWorld, serverUrl: string) {
    const { createAgentX } = await import("agentxjs");
    this.agentx = await createAgentX({ serverUrl });
    this.isConnected = true;
    this.receivedMessages.set("default", []);
  }
);

Given(
  /^a remote client "([^"]+)" connected to "([^"]+)"$/,
  async function (this: AgentXWorld, clientName: string, serverUrl: string) {
    const { createAgentX } = await import("agentxjs");
    const client = await createAgentX({ serverUrl });
    this.remoteClients.set(clientName, client);
    this.receivedMessages.set(clientName, []);
  }
);

Given(
  /^client "([^"]+)" is subscribed to "([^"]+)" text_delta events$/,
  function (this: AgentXWorld, clientName: string, _imageAlias: string) {
    const client = this.remoteClients.get(clientName);
    if (!client) throw new Error(`Client "${clientName}" not found`);

    const messages: string[] = [];
    client.on("text_delta", (event) => {
      messages.push((event.data as { text: string }).text);
    });
    this.receivedMessages.set(clientName, messages);
  }
);

Given(
  /^client is subscribed to "([^"]+)" text_delta events$/,
  function (this: AgentXWorld, _imageAlias: string) {
    if (!this.agentx) throw new Error("AgentX not initialized");

    const messages: string[] = [];
    this.agentx.on("text_delta", (event) => {
      messages.push((event.data as { text: string }).text);
      this.collectedEvents.push(event);
    });
    this.receivedMessages.set("default", messages);
  }
);

When(
  /^client sends message "([^"]+)" to image "([^"]+)"$/,
  async function (this: AgentXWorld, content: string, imageAlias: string) {
    const imageId = this.createdImages.get(imageAlias);
    if (!imageId) throw new Error(`Image "${imageAlias}" not found`);

    await this.agentx!.request("message_send_request", { imageId, content });
  }
);

When(
  /^any client sends message "([^"]+)" to image "([^"]+)"$/,
  async function (this: AgentXWorld, content: string, imageAlias: string) {
    const imageId = this.createdImages.get(imageAlias);
    if (!imageId) throw new Error(`Image "${imageAlias}" not found`);

    // Use first client
    const client = this.remoteClients.values().next().value || this.agentx;
    await client.request("message_send_request", { imageId, content });
  }
);

Then(
  /^client should receive text_delta events in order: "([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)"$/,
  async function (this: AgentXWorld, m1: string, m2: string, m3: string, m4: string, m5: string) {
    // Wait for all events
    await new Promise((r) => setTimeout(r, 500));

    const messages = this.receivedMessages.get("default") || [];
    expect(messages).toEqual([m1, m2, m3, m4, m5]);
  }
);

Then(
  /^client "([^"]+)" should receive (\d+) text_delta events$/,
  async function (this: AgentXWorld, clientName: string, count: string) {
    await new Promise((r) => setTimeout(r, 500));
    const messages = this.receivedMessages.get(clientName) || [];
    expect(messages.length).toBe(parseInt(count, 10));
  }
);

Then("both clients should receive same text", function (this: AgentXWorld) {
  const clientNames = Array.from(this.remoteClients.keys());
  if (clientNames.length < 2) throw new Error("Need at least 2 clients");

  const text1 = this.receivedMessages.get(clientNames[0])?.join("");
  const text2 = this.receivedMessages.get(clientNames[1])?.join("");

  expect(text1).toBe(text2);
});

When(
  /^client waits for (\d+) text_delta events$/,
  async function (this: AgentXWorld, count: string) {
    const expectedCount = parseInt(count, 10);
    const maxWait = 5000;
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      const messages = this.receivedMessages.get("default") || [];
      if (messages.length >= expectedCount) {
        return;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    throw new Error(`Timeout waiting for ${expectedCount} events`);
  }
);

When("client disconnects", async function (this: AgentXWorld) {
  if (this.agentx) {
    await this.agentx.dispose();
    this.agentx = undefined;
  }
});

When(
  /^wait (\d+) second(?:s)? for mock to finish emitting$/,
  async function (this: AgentXWorld, seconds: string) {
    await new Promise((r) => setTimeout(r, parseInt(seconds, 10) * 1000));
  }
);

When(/^client reconnects to "([^"]+)"$/, async function (this: AgentXWorld, serverUrl: string) {
  const { createAgentX } = await import("agentxjs");
  this.agentx = await createAgentX({ serverUrl });
});

When(
  /^client resubscribes to "([^"]+)" text_delta events$/,
  function (this: AgentXWorld, _imageAlias: string) {
    if (!this.agentx) throw new Error("AgentX not initialized");

    // Get existing messages
    const existingMessages = this.receivedMessages.get("default") || [];

    // Subscribe and append new messages
    this.agentx.on("text_delta", (event) => {
      existingMessages.push((event.data as { text: string }).text);
      this.collectedEvents.push(event);
    });
  }
);

Then(
  /^client should eventually receive (\d+) total text_delta events$/,
  async function (this: AgentXWorld, count: string) {
    const expectedCount = parseInt(count, 10);
    const maxWait = 10000;
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      const messages = this.receivedMessages.get("default") || [];
      if (messages.length >= expectedCount) {
        expect(messages.length).toBe(expectedCount);
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    const actualCount = this.receivedMessages.get("default")?.length || 0;
    throw new Error(`Expected ${expectedCount} events, got ${actualCount}`);
  }
);

Then("no events should be duplicated", function (this: AgentXWorld) {
  const messages = this.receivedMessages.get("default") || [];
  const unique = new Set(messages);
  expect(unique.size).toBe(messages.length);
});

Then(
  /^client should receive (\d+) text_delta events within (\d+) seconds$/,
  async function (this: AgentXWorld, count: string, seconds: string) {
    const expectedCount = parseInt(count, 10);
    const maxWait = parseInt(seconds, 10) * 1000;
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      const events = this.collectedEvents.filter((e) => e.type === "text_delta");
      if (events.length >= expectedCount) {
        expect(events.length).toBe(expectedCount);
        return;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    const actualCount = this.collectedEvents.filter((e) => e.type === "text_delta").length;
    throw new Error(`Expected ${expectedCount} events in ${seconds}s, got ${actualCount}`);
  }
);

Then(
  /^client should receive at least (\d+) text_delta event$/,
  async function (this: AgentXWorld, count: string) {
    await new Promise((r) => setTimeout(r, 1000));
    const messages = this.receivedMessages.get("default") || [];
    const expectedCount = parseInt(count, 10);

    if (messages.length < expectedCount) {
      throw new Error(`Expected at least ${expectedCount} events, got ${messages.length}`);
    }

    expect(messages.length).toBeGreaterThan(expectedCount - 1);
  }
);

Then("text content should not be empty", function (this: AgentXWorld) {
  const messages = this.receivedMessages.get("default") || [];
  const fullText = messages.join("");

  if (fullText.length === 0) {
    throw new Error("Expected non-empty text content");
  }

  expect(fullText.length).toBeGreaterThan(0);
});

Then(
  /^client "([^"]+)" should receive at least (\d+) text_delta event$/,
  async function (this: AgentXWorld, clientName: string, count: string) {
    await new Promise((r) => setTimeout(r, 1000));
    const messages = this.receivedMessages.get(clientName) || [];
    const expectedCount = parseInt(count, 10);
    expect(messages.length).toBeGreaterThan(expectedCount - 1);
  }
);

Then(
  /^client should receive at least (\d+) text_delta event within (\d+) seconds$/,
  async function (this: AgentXWorld, count: string, seconds: string) {
    const expectedCount = parseInt(count, 10);
    const maxWait = parseInt(seconds, 10) * 1000;
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      const messages = this.receivedMessages.get("default") || [];
      if (messages.length >= expectedCount) {
        expect(messages.length).toBeGreaterThan(expectedCount - 1);
        return;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    const actualCount = this.receivedMessages.get("default")?.length || 0;
    throw new Error(`Expected at least ${expectedCount} events in ${seconds}s, got ${actualCount}`);
  }
);
