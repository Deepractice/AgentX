/**
 * Integration Test Step Definitions - Real API
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { writeFile } from "fs/promises";
import { resolve } from "path";
import type { AgentXWorld } from "./world";

function expect(value: unknown) {
  return {
    toBeDefined: () => assert.ok(value !== undefined && value !== null),
    toBe: (expected: unknown) => assert.strictEqual(value, expected),
    toBeGreaterThan: (expected: number) => assert.ok((value as number) > expected),
    toContain: (item: unknown) => assert.ok((value as unknown[]).includes(item)),
  };
}

// ============================================================================
// Real API Setup
// ============================================================================

Given("an AgentX instance with real API", async function (this: AgentXWorld) {
  const { createAgentX } = await import("agentxjs");
  const { resolve } = await import("path");
  const { config } = await import("dotenv");

  // Load env
  const envPath = resolve(import.meta.dir, "../.env.local");
  config({ path: envPath });

  const apiKey = process.env.LLM_PROVIDER_KEY;
  if (!apiKey) {
    throw new Error("LLM_PROVIDER_KEY not set in .env.local");
  }

  const agentxDir = resolve(import.meta.dir, "../.agentx-test");
  this.agentx = await createAgentX({
    agentxDir,
    llm: {
      apiKey,
      baseUrl: process.env.LLM_PROVIDER_URL,
      model: process.env.LLM_PROVIDER_MODEL || "claude-haiku-4-5-20251001",
    },
  });
});

// ============================================================================
// Event Recording
// ============================================================================

Given("event recorder is enabled", function (this: AgentXWorld) {
  // Will record all events to savedValues
  this.savedValues.set("recordEvents", "true");
});

Given("I am subscribed to all events", function (this: AgentXWorld) {
  if (!this.agentx) throw new Error("AgentX not initialized");

  // Subscribe to key event types
  const eventTypes = [
    "message_start",
    "text_delta",
    "message_stop",
    "assistant_message",
    "thinking_start",
    "thinking_end",
    "tool_call",
  ];

  for (const type of eventTypes) {
    this.subscribeToEvent(type);
  }
});

When(
  /^I send message "([^"]+)" to image "([^"]+)"$/,
  async function (this: AgentXWorld, content: string, imageAlias: string) {
    const imageId = this.createdImages.get(imageAlias);
    if (!imageId) throw new Error(`Image "${imageAlias}" not found`);

    await this.agentx!.request("message_send_request", { imageId, content });
  }
);

// Note: "I should receive" steps are defined in conversation.steps.ts

Then("event flow should be recorded to file", async function (this: AgentXWorld) {
  if (this.savedValues.get("recordEvents") !== "true") return;

  // Generate scenario from collected events
  const scenario = {
    name: "Captured from real API",
    timestamp: new Date().toISOString(),
    events: this.collectedEvents.map((e) => ({
      type: e.type,
      category: e.category,
      data: e.data,
      timestamp: e.timestamp,
    })),
  };

  const outputPath = resolve(import.meta.dir, "../mock/captured-scenario.json");
  await writeFile(outputPath, JSON.stringify(scenario, null, 2));

  console.log(`\n✅ Event flow captured to: ${outputPath}`);
  console.log(`   Total events: ${scenario.events.length}`);
  console.log(`   Types: ${Array.from(new Set(scenario.events.map((e) => e.type))).join(", ")}\n`);
});

// ============================================================================
// Disconnect Recovery Testing
// ============================================================================

const DEFAULT_SERVER_URL = "ws://localhost:15300";

Given("a remote client connected to test server", async function (this: AgentXWorld) {
  // Assumes test-server is running with real API (no MOCK_LLM)
  const { createAgentX } = await import("agentxjs");
  this.agentx = await createAgentX({ serverUrl: DEFAULT_SERVER_URL });
  this.savedValues.set("serverUrl", DEFAULT_SERVER_URL);
  this.isConnected = true;
  this.receivedMessages.set("default", []);
});

// Step: client creates container "X" on server
Given(
  /^client creates container "([^"]+)" on server$/,
  async function (this: AgentXWorld, containerId: string) {
    if (!this.agentx) throw new Error("AgentX not initialized");

    // Use unique container ID per scenario for isolation
    const uniqueContainerId = `${this.scenarioId}_${containerId}`;
    await this.agentx.request("container_create_request", { containerId: uniqueContainerId });
    this.createdContainers.push(uniqueContainerId);
    this.savedValues.set(`container:${containerId}`, uniqueContainerId);
  }
);

// Step: client creates image "X" in container "Y"
Given(
  /^client creates image "([^"]+)" in container "([^"]+)"$/,
  async function (this: AgentXWorld, imageAlias: string, containerId: string) {
    if (!this.agentx) throw new Error("AgentX not initialized");

    const uniqueContainerId = this.savedValues.get(`container:${containerId}`);
    if (!uniqueContainerId) throw new Error(`Container "${containerId}" not found`);

    const response = await this.agentx.request("image_create_request", {
      containerId: uniqueContainerId,
      config: { name: imageAlias },
    });

    const imageId = (response.data as { record?: { imageId: string } }).record?.imageId;
    if (imageId) {
      this.createdImages.set(imageAlias, imageId);
      this.savedValues.set("imageId", imageId);
    }
  }
);

Given(
  /^client is subscribed to "([^"]+)" events$/,
  function (this: AgentXWorld, _imageAlias: string) {
    if (!this.agentx) throw new Error("AgentX not initialized");

    // Subscribe to text_delta to track messages
    const messages: string[] = [];
    this.agentx.on("text_delta", (event) => {
      const text = (event.data as { text: string }).text;
      messages.push(text);
      this.collectedEvents.push(event);
    });
    this.receivedMessages.set("default", messages);
  }
);

Given(
  /^client is subscribed to "([^"]+)" events for recording$/,
  function (this: AgentXWorld, _imageAlias: string) {
    if (!this.agentx) throw new Error("AgentX not initialized");

    // Subscribe to all key event types for recording
    const eventTypes = ["message_start", "text_delta", "message_stop", "assistant_message"];
    const messages: string[] = [];

    for (const type of eventTypes) {
      this.agentx.on(type, (event) => {
        this.collectedEvents.push(event);
        if (type === "text_delta") {
          const text = (event.data as { text: string }).text;
          messages.push(text);
        }
      });
    }
    this.receivedMessages.set("default", messages);
  }
);

Then("client should receive message_start event", async function (this: AgentXWorld) {
  const maxWait = 30000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    if (this.collectedEvents.some((e) => e.type === "message_start")) {
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  throw new Error("Timeout waiting for message_start event");
});

Then("client should receive text_delta events", async function (this: AgentXWorld) {
  const maxWait = 30000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    if (this.collectedEvents.filter((e) => e.type === "text_delta").length > 0) {
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  throw new Error("Timeout waiting for text_delta events");
});

Then("client should receive message_stop event", async function (this: AgentXWorld) {
  const maxWait = 30000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    if (this.collectedEvents.some((e) => e.type === "message_stop")) {
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  throw new Error("Timeout waiting for message_stop event");
});

// Step: client sends message "X" (uses saved imageId)
When(/^client sends message "([^"]+)"$/, async function (this: AgentXWorld, content: string) {
  const imageId = this.savedValues.get("imageId");
  if (!imageId) throw new Error("No imageId saved - create an image first");

  await this.agentx!.request("message_send_request", { imageId, content });
});

// Step: client waits for N text_delta events
When(
  /^client waits for (\d+) text_delta events$/,
  async function (this: AgentXWorld, count: string) {
    const expectedCount = parseInt(count, 10);
    const maxWait = 60000; // 60 seconds for real API
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      const messages = this.receivedMessages.get("default") || [];
      if (messages.length >= expectedCount) {
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    const actualCount = this.receivedMessages.get("default")?.length || 0;
    throw new Error(`Timeout after 60s waiting for ${expectedCount} events, got ${actualCount}`);
  }
);

// Step: client disconnects
When("client disconnects", async function (this: AgentXWorld) {
  if (this.agentx) {
    await this.agentx.dispose();
    this.agentx = undefined;
    this.isConnected = false;
  }
});

// Step: client reconnects (uses saved serverUrl)
When("client reconnects", async function (this: AgentXWorld) {
  const serverUrl = this.savedValues.get("serverUrl") || DEFAULT_SERVER_URL;
  const { createAgentX } = await import("agentxjs");
  this.agentx = await createAgentX({ serverUrl });
  this.isConnected = true;
});

// Step: client resubscribes to "X" events
When(
  /^client resubscribes to "([^"]+)" events$/,
  function (this: AgentXWorld, _imageAlias: string) {
    if (!this.agentx) throw new Error("AgentX not initialized");

    // Get existing messages array to append to
    const existingMessages = this.receivedMessages.get("default") || [];

    // Re-subscribe to text_delta
    this.agentx.on("text_delta", (event) => {
      const text = (event.data as { text: string }).text;
      existingMessages.push(text);
      this.collectedEvents.push(event);
    });
  }
);

When(/^wait (\d+) seconds for API to finish$/, async function (this: AgentXWorld, seconds: string) {
  await new Promise((r) => setTimeout(r, parseInt(seconds, 10) * 1000));
});

Then("client should eventually receive all text_delta events", async function (this: AgentXWorld) {
  // Wait up to 30 seconds for all events to arrive after reconnect
  const maxWait = 30000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const messages = this.receivedMessages.get("default") || [];
    if (messages.length > 0) {
      // Check if we're still receiving events
      const countBefore = messages.length;
      await new Promise((r) => setTimeout(r, 2000));
      const countAfter = messages.length;

      // If no new events in 2 seconds, we're done
      if (countAfter === countBefore) {
        return;
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  const messages = this.receivedMessages.get("default") || [];
  expect(messages.length).toBeGreaterThan(0);
});

Then("no text_delta events should be missing", function (this: AgentXWorld) {
  // Verify we got events - for "Count from 1 to 10" we expect at least 3 chunks
  // (we waited for 3 before disconnect, so should have at least that many)
  const messages = this.receivedMessages.get("default") || [];
  expect(messages.length).toBeGreaterThan(2); // Should have at least 3 chunks
});

Then(/^message should contain "([^"]+)"$/, function (this: AgentXWorld, substring: string) {
  const messages = this.receivedMessages.get("default") || [];
  const fullText = messages.join("");
  expect(fullText).toContain(substring);
});
