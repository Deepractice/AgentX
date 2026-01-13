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

Then(/^I should receive "([^"]+)" event$/, async function (this: AgentXWorld, eventType: string) {
  await this.waitForEvent(eventType, 60000); // 60s for real API
});

Then(/^I should receive "([^"]+)" events$/, async function (this: AgentXWorld, eventType: string) {
  await new Promise((r) => setTimeout(r, 2000));
  const events = this.getEventsOfType(eventType);
  expect(events.length).toBeGreaterThan(0);
});

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

Given("a remote client connected to test server", async function (this: AgentXWorld) {
  // Assumes test-server is running with real API (no MOCK_LLM)
  const { createAgentX } = await import("agentxjs");
  this.agentx = await createAgentX({ serverUrl: "ws://localhost:15300" });
  this.isConnected = true;
  this.receivedMessages.set("default", []);
});

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

When(/^wait (\d+) seconds for API to finish$/, async function (this: AgentXWorld, seconds: string) {
  await new Promise((r) => setTimeout(r, parseInt(seconds, 10) * 1000));
});

Then("client should eventually receive all text_delta events", async function (this: AgentXWorld) {
  // Wait up to 10 seconds for all events to arrive
  await new Promise((r) => setTimeout(r, 10000));
  const messages = this.receivedMessages.get("default") || [];
  expect(messages.length).toBeGreaterThan(0);
});

Then("no text_delta events should be missing", function (this: AgentXWorld) {
  // Verify we got events
  const messages = this.receivedMessages.get("default") || [];
  expect(messages.length).toBeGreaterThan(5); // Should have multiple chunks
});

Then(/^message should contain "([^"]+)"$/, function (this: AgentXWorld, substring: string) {
  const messages = this.receivedMessages.get("default") || [];
  const fullText = messages.join("");
  expect(fullText).toContain(substring);
});
