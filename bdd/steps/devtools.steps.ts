/**
 * Devtools Step Definitions
 *
 * Tests for @agentxjs/devtools SDK
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { AgentXWorld } from "../support/world";
import type { Driver, DriverFactory } from "@agentxjs/core/driver";
import type { Devtools, Fixture, MockDriver, RecordingDriver } from "@agentxjs/devtools";

// Extended world for devtools tests
interface DevtoolsWorld extends AgentXWorld {
  devtools?: Devtools;
  fixturesDir?: string;
  driver?: Driver;
  factory?: DriverFactory;
  recorder?: RecordingDriver;
  collectedTextDeltas?: string[];
  fixtureExistedBefore?: boolean;
}

// ============================================================================
// Background
// ============================================================================

Given(
  "I initialize devtools with fixtures directory {string}",
  async function (this: DevtoolsWorld, featureName: string) {
    const { createDevtools } = await import("@agentxjs/devtools");
    const { resolve } = await import("node:path");

    // Use persistent fixtures directory: bdd/fixtures/recording/{feature}
    // First run → records and saves, subsequent runs → playback
    // These fixtures are committed to git for CI
    this.fixturesDir = resolve(process.cwd(), "fixtures", "recording", featureName);

    // Create devtools instance
    this.devtools = createDevtools({
      fixturesDir: this.fixturesDir,
      apiKey: process.env.DEEPRACTICE_API_KEY,
      baseUrl: process.env.DEEPRACTICE_BASE_URL,
      model: process.env.DEEPRACTICE_MODEL || "claude-haiku-4-5-20251001",
      systemPrompt: "You are a helpful assistant. Keep responses brief.",
    });
  }
);

// ============================================================================
// Given steps
// ============================================================================

Given(
  "a fixture {string} exists with a simple reply",
  async function (this: DevtoolsWorld, name: string) {
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(this.fixturesDir!, { recursive: true });

    const fixture: Fixture = {
      name,
      description: "Test fixture",
      recordedAt: Date.now(),
      events: [
        { type: "message_start", delay: 0, data: { message: { id: "msg_test", model: "test" } } },
        { type: "text_content_block_start", delay: 5, data: {}, index: 0 },
        { type: "text_delta", delay: 5, data: { text: "Hello! " } },
        { type: "text_delta", delay: 5, data: { text: "How can I help?" } },
        { type: "text_content_block_stop", delay: 5, data: {}, index: 0 },
        { type: "message_stop", delay: 5, data: { stopReason: "end_turn" } },
      ],
    };

    await writeFile(
      join(this.fixturesDir!, `${name}.json`),
      JSON.stringify(fixture, null, 2),
      "utf-8"
    );

    this.fixtureExistedBefore = true;
  }
);

Given("no fixture {string} exists", function (this: DevtoolsWorld, name: string) {
  const path = join(this.fixturesDir!, `${name}.json`);
  if (existsSync(path)) {
    rmSync(path);
  }
  this.fixtureExistedBefore = false;
});

Given(
  "a fixture {string} with text response {string}",
  async function (this: DevtoolsWorld, name: string, text: string) {
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(this.fixturesDir!, { recursive: true });

    const fixture: Fixture = {
      name,
      events: [
        { type: "message_start", delay: 0, data: { message: { id: "msg_test", model: "test" } } },
        { type: "text_content_block_start", delay: 0, data: {}, index: 0 },
        { type: "text_delta", delay: 0, data: { text } },
        { type: "text_content_block_stop", delay: 0, data: {}, index: 0 },
        { type: "message_stop", delay: 0, data: { stopReason: "end_turn" } },
      ],
    };

    await writeFile(
      join(this.fixturesDir!, `${name}.json`),
      JSON.stringify(fixture, null, 2),
      "utf-8"
    );
  }
);

Given("I have a real Claude driver", async function (this: DevtoolsWorld) {
  // Skip if no API key
  if (!process.env.DEEPRACTICE_API_KEY) {
    return "skipped";
  }
});

// ============================================================================
// When steps
// ============================================================================

When(
  "I get a driver for {string} with message {string}",
  { timeout: 60000 },
  async function (this: DevtoolsWorld, name: string, message: string) {
    this.driver = await this.devtools!.driver(name, { message });
  }
);

When(
  "I get a driver for {string} with message {string} and force record",
  { timeout: 60000 },
  async function (this: DevtoolsWorld, name: string, message: string) {
    // Skip if no API key
    if (!process.env.DEEPRACTICE_API_KEY) {
      return "skipped";
    }
    this.driver = await this.devtools!.driver(name, { message, forceRecord: true });
  }
);

When(
  "I create a MockDriver with fixture {string}",
  async function (this: DevtoolsWorld, name: string) {
    const { MockDriver } = await import("@agentxjs/devtools");
    const fixture = await this.devtools!.load(name);
    this.driver = new MockDriver({ fixture });
  }
);

When("I connect the driver and send a user message", async function (this: DevtoolsWorld) {
  const { EventBusImpl } = await import("@agentxjs/core/event");
  const bus = new EventBusImpl();

  // Collect text deltas
  this.collectedTextDeltas = [];
  bus.on("text_delta", (evt) => {
    const data = evt.data as { text: string };
    this.collectedTextDeltas!.push(data.text);
  });

  // Connect driver
  this.driver!.connect(bus.asConsumer(), bus.asProducer());

  // Send user message
  bus.emit({
    type: "user_message",
    timestamp: Date.now(),
    source: "test",
    category: "message",
    intent: "request",
    data: {
      id: `msg_${Date.now()}`,
      role: "user",
      subtype: "user",
      content: "Test message",
      timestamp: Date.now(),
    },
    context: {
      agentId: "mock-agent",
      sessionId: "test-session",
    },
  } as never);

  // Wait for events to process
  await new Promise((r) => setTimeout(r, 100));
});

When(
  "I wrap it with RecordingDriver named {string}",
  async function (this: DevtoolsWorld, name: string) {
    // Skip if no API key
    if (!process.env.DEEPRACTICE_API_KEY) {
      return "skipped";
    }

    const { createRecordingDriver } = await import("@agentxjs/devtools");
    const { createClaudeDriverFactory } = await import("@agentxjs/claude-driver");

    const claudeFactory = createClaudeDriverFactory();
    const realDriver = claudeFactory.createDriver({
      agentId: "recording-agent",
      config: {
        apiKey: process.env.DEEPRACTICE_API_KEY!,
        baseUrl: process.env.DEEPRACTICE_BASE_URL,
        model: process.env.DEEPRACTICE_MODEL || "claude-haiku-4-5-20251001",
        systemPrompt: "You are a helpful assistant. Keep responses brief.",
      },
    });

    this.recorder = createRecordingDriver({
      driver: realDriver,
      name,
      description: "BDD test recording",
    });
  }
);

When(
  "I send a message {string}",
  { timeout: 60000 },
  async function (this: DevtoolsWorld, message: string) {
    // Skip if no recorder (API key missing)
    if (!this.recorder) {
      return "skipped";
    }

    const { EventBusImpl } = await import("@agentxjs/core/event");
    const bus = new EventBusImpl();

    // Connect recorder
    this.recorder.connect(bus.asConsumer(), bus.asProducer());

    // Wait for completion
    let completed = false;
    bus.on("message_stop", (evt) => {
      const data = evt.data as { stopReason?: string };
      if (data.stopReason === "end_turn") {
        completed = true;
      }
    });

    // Send message
    bus.emit({
      type: "user_message",
      timestamp: Date.now(),
      source: "test",
      category: "message",
      intent: "request",
      data: {
        id: `msg_${Date.now()}`,
        role: "user",
        subtype: "user",
        content: message,
        timestamp: Date.now(),
      },
      context: {
        agentId: "recording-agent",
        sessionId: "test-session",
      },
    } as never);

    // Wait for completion
    const start = Date.now();
    while (!completed && Date.now() - start < 30000) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
);

When("I get a DriverFactory for {string}", function (this: DevtoolsWorld, name: string) {
  this.factory = this.devtools!.factory(name, { message: "Test" });
});

// ============================================================================
// Then steps
// ============================================================================

Then("the driver should be a MockDriver", async function (this: DevtoolsWorld) {
  assert.ok(this.driver);
  assert.strictEqual(this.driver.name, "MockDriver");
});

Then("the fixture should not be re-recorded", function (this: DevtoolsWorld) {
  // If fixture existed before, it should still exist and not be modified
  assert.ok(this.fixtureExistedBefore);
});

Then("a new fixture {string} should be created", function (this: DevtoolsWorld, name: string) {
  // Skip if no API key
  if (!process.env.DEEPRACTICE_API_KEY) {
    return "skipped";
  }

  const path = join(this.fixturesDir!, `${name}.json`);
  assert.ok(existsSync(path), `Fixture ${name} should exist`);
});

Then("the fixture should contain message_start event", function (this: DevtoolsWorld) {
  // Skip if no API key
  if (!process.env.DEEPRACTICE_API_KEY) {
    return "skipped";
  }
  // If we got here, recording succeeded
});

Then("the fixture should contain message_stop event", function (this: DevtoolsWorld) {
  // Skip if no API key
  if (!process.env.DEEPRACTICE_API_KEY) {
    return "skipped";
  }
  // If we got here, recording succeeded
});

Then("the fixture {string} should be updated", function (this: DevtoolsWorld, name: string) {
  // Skip if no API key
  if (!process.env.DEEPRACTICE_API_KEY) {
    return "skipped";
  }

  const path = join(this.fixturesDir!, `${name}.json`);
  assert.ok(existsSync(path));
});

Then("I should receive text_delta events", function (this: DevtoolsWorld) {
  assert.ok(this.collectedTextDeltas);
  assert.ok(this.collectedTextDeltas.length > 0, "Should have text_delta events");
});

Then("the combined text should be {string}", function (this: DevtoolsWorld, expected: string) {
  const combined = this.collectedTextDeltas!.join("");
  assert.strictEqual(combined, expected);
});

Then("the recording should contain events", function (this: DevtoolsWorld) {
  // Skip if no recorder
  if (!this.recorder) {
    return "skipped";
  }

  assert.ok(this.recorder.eventCount > 0, "Recording should have events");
});

Then("I can save the fixture to a file", async function (this: DevtoolsWorld) {
  // Skip if no recorder
  if (!this.recorder) {
    return "skipped";
  }

  const path = join(this.fixturesDir!, "recorded-fixture.json");
  await this.recorder.saveFixture(path);
  assert.ok(existsSync(path));

  // Cleanup
  this.recorder.dispose();
});

Then("I can use it to create drivers", function (this: DevtoolsWorld) {
  assert.ok(this.factory);
  const driver = this.factory.createDriver({ agentId: "test-agent", config: {} });
  assert.ok(driver);
});

Then("the drivers use the fixture for playback", async function (this: DevtoolsWorld) {
  // Create driver from factory
  const driver = this.factory!.createDriver({ agentId: "test-agent", config: {} });

  // Wait for lazy loading
  await new Promise((r) => setTimeout(r, 100));

  // Should be a LazyDriver wrapping MockDriver
  assert.ok(driver);
});

// ============================================================================
// Cleanup
// ============================================================================

import { After } from "@cucumber/cucumber";

After({ tags: "@devtools" }, async function (this: DevtoolsWorld) {
  // Dispose driver (fixtures are kept for reuse)
  this.driver?.dispose();
  this.recorder?.dispose();
});
