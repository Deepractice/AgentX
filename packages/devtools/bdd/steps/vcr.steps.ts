/**
 * VCR Recording Pipeline Steps
 *
 * Tests the recording chain: MonoDriver → AI SDK → Deepractice Relay → LLM
 */

import { Given, When, Then, BeforeAll } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { env } from "../../src/env";
import type { DriverStreamEvent } from "@agentxjs/core/driver";
import type { UserMessage } from "@agentxjs/core/agent";

// ============================================================================
// Shared state
// ============================================================================

let events: DriverStreamEvent[] = [];
let recordingFixture: any = null;

BeforeAll(function () {
  console.log(`\n[VCR BDD] API Key: ${env.apiKey ? "set (" + env.apiKey.length + " chars)" : "NOT SET"}`);
  console.log(`[VCR BDD] Base URL: ${env.baseUrl || "NOT SET"}`);
  console.log(`[VCR BDD] Model: ${env.model}\n`);
});

// ============================================================================
// Scenario 1: MonoDriver direct
// ============================================================================

Given(
  "a MonoDriver configured with Deepractice API credentials",
  function () {
    assert.ok(env.apiKey, "DEEPRACTICE_API_KEY is not set");
    assert.ok(env.baseUrl, "DEEPRACTICE_BASE_URL is not set");
    events = [];
  }
);

When(
  "I send a simple message {string}",
  { timeout: 60000 },
  async function (text: string) {
    const { createMonoDriver } = await import("@agentxjs/mono-driver");

    const driver = createMonoDriver({
      apiKey: env.apiKey!,
      baseUrl: env.baseUrl!,
      model: env.model,
      provider: "anthropic",
      systemPrompt: "You are a helpful assistant. Reply very briefly.",
      tools: {},
    });

    await driver.initialize({} as any);

    const userMessage: UserMessage = {
      role: "user",
      subtype: "user",
      content: text,
      timestamp: Date.now(),
    };

    events = [];
    try {
      for await (const event of driver.receive(userMessage)) {
        events.push(event);
        console.log(`  [Event] ${event.type}`, event.type === "error" ? (event.data as any).message : "");
      }
    } catch (err) {
      console.error("  [Driver Error]", err);
    }

    console.log(`  [Total events] ${events.length}`);
    await driver.dispose();
  }
);

Then("the driver should emit a message_start event", function () {
  const found = events.some((e) => e.type === "message_start");
  assert.ok(found, `No message_start event. Events: [${events.map((e) => e.type).join(", ")}]`);
});

Then("the driver should emit at least one text_delta event", function () {
  const found = events.some((e) => e.type === "text_delta");
  assert.ok(found, `No text_delta event. Events: [${events.map((e) => e.type).join(", ")}]`);
});

Then("the driver should emit a message_stop event", function () {
  const found = events.some((e) => e.type === "message_stop");
  assert.ok(found, `No message_stop event. Events: [${events.map((e) => e.type).join(", ")}]`);
});

Then("there should be no error events", function () {
  const errors = events.filter((e) => e.type === "error");
  assert.equal(
    errors.length,
    0,
    `Found ${errors.length} error events: ${errors.map((e) => (e.data as any).message).join("; ")}`
  );
});

// ============================================================================
// Scenario 2: RecordingDriver
// ============================================================================

Given(
  "a RecordingDriver wrapping a MonoDriver with Deepractice credentials",
  function () {
    assert.ok(env.apiKey, "DEEPRACTICE_API_KEY is not set");
    assert.ok(env.baseUrl, "DEEPRACTICE_BASE_URL is not set");
    events = [];
    recordingFixture = null;
  }
);

// "When I send a simple message" is reused from Scenario 1,
// but we need a different version that uses RecordingDriver
When(
  "I send a simple message {string} via recorder",
  { timeout: 60000 },
  async function (text: string) {
    const { createMonoDriver } = await import("@agentxjs/mono-driver");
    const { RecordingDriver } = await import("../../src/recorder/RecordingDriver");

    const realDriver = createMonoDriver({
      apiKey: env.apiKey!,
      baseUrl: env.baseUrl!,
      model: env.model,
      provider: "anthropic",
      systemPrompt: "You are a helpful assistant. Reply very briefly.",
      tools: {},
    });

    const recorder = new RecordingDriver({
      driver: realDriver,
      name: "vcr-test",
      description: "BDD test recording",
    });

    await recorder.initialize({} as any);

    const userMessage: UserMessage = {
      role: "user",
      subtype: "user",
      content: text,
      timestamp: Date.now(),
    };

    events = [];
    try {
      for await (const event of recorder.receive(userMessage)) {
        events.push(event);
        console.log(`  [Recorded Event] ${event.type}`, event.type === "error" ? (event.data as any).message : "");
      }
    } catch (err) {
      console.error("  [Recorder Error]", err);
    }

    recordingFixture = recorder.getFixture();
    console.log(`  [Total recorded events] ${recordingFixture.events.length}`);
    await recorder.dispose();
  }
);

Then("the recording should contain a message_start event", function () {
  assert.ok(recordingFixture, "No recording fixture");
  const found = recordingFixture.events.some((e: any) => e.type === "message_start");
  assert.ok(found, `No message_start in recording. Events: [${recordingFixture.events.map((e: any) => e.type).join(", ")}]`);
});

Then("the recording should contain at least one text_delta event", function () {
  assert.ok(recordingFixture, "No recording fixture");
  const found = recordingFixture.events.some((e: any) => e.type === "text_delta");
  assert.ok(found, `No text_delta in recording. Events: [${recordingFixture.events.map((e: any) => e.type).join(", ")}]`);
});

Then("the recording should contain a message_stop event", function () {
  assert.ok(recordingFixture, "No recording fixture");
  const found = recordingFixture.events.some((e: any) => e.type === "message_stop");
  assert.ok(found, `No message_stop in recording. Events: [${recordingFixture.events.map((e: any) => e.type).join(", ")}]`);
});

Then("the recorded fixture should be saveable to disk", function () {
  assert.ok(recordingFixture, "No recording fixture");
  // Just verify the fixture is valid JSON-serializable
  const json = JSON.stringify(recordingFixture);
  assert.ok(json.length > 0, "Fixture serialized to empty string");
  assert.ok(recordingFixture.events.length > 0, "Fixture has no events");
});
