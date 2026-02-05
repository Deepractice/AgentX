/**
 * MonoDriver Step Definitions
 *
 * Direct Driver-layer BDD tests for MonoDriver.
 * Uses VCR mechanism: fixture exists → playback, missing → record real API calls.
 */

import { Given, When, Then, BeforeAll } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { resolve } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import type { AgentXWorld } from "../support/world";
import type { CreateDriver, ToolDefinition } from "@agentxjs/core/driver";
import { createBashTool } from "@agentxjs/core/bash";
import { NodeBashProvider } from "@agentxjs/node-platform";

// ============================================================================
// VCR Configuration for MonoDriver
// ============================================================================

const MONO_FIXTURES_DIR = "fixtures/recording/mono-driver";

let monoVcrCreateDriver: CreateDriver | null = null;

BeforeAll(async function () {
  const fixturesPath = resolve(process.cwd(), MONO_FIXTURES_DIR);
  if (!existsSync(fixturesPath)) {
    mkdirSync(fixturesPath, { recursive: true });
  }

  const { createMonoDriver } = await import("@agentxjs/mono-driver");
  const { createVcrCreateDriver } = await import("@agentxjs/devtools");

  const apiKey =
    process.env.ANTHROPIC_API_KEY ||
    process.env.DEEPRACTICE_API_KEY ||
    "test-key";
  const baseUrl = process.env.DEEPRACTICE_BASE_URL;
  const model = process.env.DEEPRACTICE_MODEL || "claude-haiku-4-5-20251001";

  console.log(`\n[MonoDriver BDD] VCR Mode - fixtures: ${MONO_FIXTURES_DIR}/\n`);

  monoVcrCreateDriver = createVcrCreateDriver({
    fixturesDir: fixturesPath,
    getFixtureName: () => currentMonoFixture,
    apiKey,
    baseUrl,
    model,
    createRealDriver: createMonoDriver as unknown as CreateDriver,
    onPlayback: (name) => console.log(`[MonoVCR] Playback: ${name}`),
    onRecording: (name) => console.log(`[MonoVCR] Recording: ${name}`),
    onSaved: (name, count) =>
      console.log(`[MonoVCR] Saved: ${name} (${count} events)`),
  });
});

let currentMonoFixture: string | null = null;

// ============================================================================
// Given Steps
// ============================================================================

Given(
  "I have a MonoDriver with provider {string}",
  async function (this: AgentXWorld, provider: string) {
    assert.ok(monoVcrCreateDriver, "VCR CreateDriver not initialized");

    // Set fixture name from scenario name
    currentMonoFixture = this.scenarioName;

    const apiKey =
      process.env.ANTHROPIC_API_KEY ||
      process.env.DEEPRACTICE_API_KEY ||
      "test-key";
    const baseUrl = process.env.DEEPRACTICE_BASE_URL;

    const config = {
      apiKey,
      baseUrl,
      agentId: "bdd-test",
      systemPrompt:
        "You are a helpful assistant. Reply briefly in one short sentence.",
      model: process.env.DEEPRACTICE_MODEL || "claude-haiku-4-5-20251001",
      options: { provider },
    };

    this.monoDriver = monoVcrCreateDriver(config);
    await this.monoDriver.initialize();
    this.driverEvents = [];
  }
);

Given(
  "I have a MonoDriver with provider {string} and a calculator tool",
  async function (this: AgentXWorld, provider: string) {
    assert.ok(monoVcrCreateDriver, "VCR CreateDriver not initialized");

    currentMonoFixture = this.scenarioName;

    const apiKey =
      process.env.ANTHROPIC_API_KEY ||
      process.env.DEEPRACTICE_API_KEY ||
      "test-key";
    const baseUrl = process.env.DEEPRACTICE_BASE_URL;

    const calculator: ToolDefinition = {
      name: "calculator",
      description: "Evaluates a math expression and returns the result. Use this for any arithmetic.",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "Math expression, e.g. '123 * 456'" },
        },
        required: ["expression"],
      },
      execute: async (params) => {
        const expr = params.expression as string;
        const result = new Function(`"use strict"; return (${expr})`)();
        return { result: String(result) };
      },
    };

    const config = {
      apiKey,
      baseUrl,
      agentId: "bdd-tool-test",
      systemPrompt:
        "You are a helpful assistant. Always use the calculator tool for math calculations. Be brief.",
      model: process.env.DEEPRACTICE_MODEL || "claude-haiku-4-5-20251001",
      tools: [calculator],
      options: { provider },
    };

    this.monoDriver = monoVcrCreateDriver(config);
    await this.monoDriver.initialize();
    this.driverEvents = [];
  }
);

Given(
  "I have a MonoDriver with provider {string} and a bash tool",
  async function (this: AgentXWorld, provider: string) {
    assert.ok(monoVcrCreateDriver, "VCR CreateDriver not initialized");

    currentMonoFixture = this.scenarioName;

    const apiKey =
      process.env.ANTHROPIC_API_KEY ||
      process.env.DEEPRACTICE_API_KEY ||
      "test-key";
    const baseUrl = process.env.DEEPRACTICE_BASE_URL;

    const bashProvider = new NodeBashProvider();
    const bashTool = createBashTool(bashProvider);

    const config = {
      apiKey,
      baseUrl,
      agentId: "bdd-bash-test",
      systemPrompt:
        "You are a helpful assistant. When asked to run a command, always use the bash tool. Be brief.",
      model: process.env.DEEPRACTICE_MODEL || "claude-haiku-4-5-20251001",
      tools: [bashTool],
      options: { provider },
    };

    this.monoDriver = monoVcrCreateDriver(config);
    await this.monoDriver.initialize();
    this.driverEvents = [];
  }
);

Given(
  "I have a MonoDriver with provider {string} and MCP filesystem server",
  async function (this: AgentXWorld, provider: string) {
    assert.ok(monoVcrCreateDriver, "VCR CreateDriver not initialized");

    currentMonoFixture = this.scenarioName;

    const apiKey =
      process.env.ANTHROPIC_API_KEY ||
      process.env.DEEPRACTICE_API_KEY ||
      "test-key";
    const baseUrl = process.env.DEEPRACTICE_BASE_URL;

    const mcpTestDir = resolve(process.cwd(), "fixtures/mcp-test");

    const config = {
      apiKey,
      baseUrl,
      agentId: "bdd-mcp-test",
      systemPrompt:
        `You are a helpful assistant. When asked to read a file, use the read_file tool. Files are located in ${mcpTestDir}. Always use the full absolute path. Be brief.`,
      model: process.env.DEEPRACTICE_MODEL || "claude-haiku-4-5-20251001",
      mcpServers: {
        filesystem: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-filesystem", mcpTestDir],
        },
      },
      options: { provider },
    };

    this.monoDriver = monoVcrCreateDriver(config);
    await this.monoDriver.initialize();
    this.driverEvents = [];
  }
);

// ============================================================================
// When Steps
// ============================================================================

When(
  "I send message {string} to the driver",
  { timeout: 30000 },
  async function (this: AgentXWorld, message: string) {
    assert.ok(this.monoDriver, "MonoDriver not initialized");

    const userMessage = {
      id: `msg_${Date.now()}`,
      role: "user" as const,
      subtype: "user" as const,
      content: message,
      timestamp: Date.now(),
    };

    for await (const event of this.monoDriver.receive(userMessage)) {
      this.driverEvents.push(event);
    }
  }
);

// ============================================================================
// Then Steps - Event Assertions
// ============================================================================

Then(
  "I should receive a {string} driver event",
  function (this: AgentXWorld, eventType: string) {
    const events = this.driverEvents.filter((e) => e.type === eventType);
    assert.ok(
      events.length > 0,
      `Expected at least one "${eventType}" event, got none. Events: [${this.driverEvents.map((e) => e.type).join(", ")}]`
    );
  }
);

Then(
  "I should receive {string} driver events",
  function (this: AgentXWorld, eventType: string) {
    const events = this.driverEvents.filter((e) => e.type === eventType);
    assert.ok(
      events.length > 0,
      `Expected "${eventType}" events, got none. Events: [${this.driverEvents.map((e) => e.type).join(", ")}]`
    );
  }
);

Then(
  "I should receive a {string} driver event with stopReason {string}",
  function (this: AgentXWorld, eventType: string, stopReason: string) {
    const events = this.driverEvents.filter((e) => e.type === eventType);
    assert.ok(events.length > 0, `Expected "${eventType}" event, got none`);

    const lastEvent = events[events.length - 1];
    const data = lastEvent.data as { stopReason?: string };
    assert.strictEqual(
      data.stopReason,
      stopReason,
      `Expected stopReason "${stopReason}", got "${data.stopReason}"`
    );
  }
);

Then(
  "the combined text delta should not be empty",
  function (this: AgentXWorld) {
    const textEvents = this.driverEvents.filter(
      (e) => e.type === "text_delta"
    );
    const combinedText = textEvents
      .map((e) => (e.data as { text: string }).text)
      .join("");
    assert.ok(
      combinedText.trim().length > 0,
      "Combined text delta should not be empty"
    );
  }
);

Then(
  "the combined text delta should contain {string}",
  function (this: AgentXWorld, expected: string) {
    const textEvents = this.driverEvents.filter(
      (e) => e.type === "text_delta"
    );
    const combinedText = textEvents
      .map((e) => (e.data as { text: string }).text)
      .join("");
    // Normalize commas in numbers for flexible matching (LLMs format "56088" as "56,088")
    const normalizedText = combinedText.replace(/,/g, "");
    const normalizedExpected = expected.replace(/,/g, "");
    assert.ok(
      normalizedText.includes(normalizedExpected),
      `Expected combined text to contain "${expected}", got: "${combinedText}"`
    );
  }
);

Then(
  "the driver state should be {string}",
  function (this: AgentXWorld, expectedState: string) {
    assert.ok(this.monoDriver, "MonoDriver not initialized");
    assert.strictEqual(
      this.monoDriver.state,
      expectedState,
      `Expected driver state "${expectedState}", got "${this.monoDriver.state}"`
    );
  }
);

// ============================================================================
// Then Steps - Event Ordering
// ============================================================================

Then(
  "the first driver event should be {string}",
  function (this: AgentXWorld, eventType: string) {
    assert.ok(
      this.driverEvents.length > 0,
      "No driver events were received"
    );
    assert.strictEqual(
      this.driverEvents[0].type,
      eventType,
      `Expected first event to be "${eventType}", got "${this.driverEvents[0].type}"`
    );
  }
);

Then(
  "the last driver event should be {string}",
  function (this: AgentXWorld, eventType: string) {
    assert.ok(
      this.driverEvents.length > 0,
      "No driver events were received"
    );
    const lastEvent = this.driverEvents[this.driverEvents.length - 1];
    assert.strictEqual(
      lastEvent.type,
      eventType,
      `Expected last event to be "${eventType}", got "${lastEvent.type}"`
    );
  }
);

Then(
  "{string} events should appear between {string} and {string}",
  function (
    this: AgentXWorld,
    middleType: string,
    startType: string,
    endType: string
  ) {
    const startIndex = this.driverEvents.findIndex(
      (e) => e.type === startType
    );
    const endIndex = this.driverEvents.findIndex((e) => e.type === endType);

    assert.ok(startIndex >= 0, `"${startType}" event not found`);
    assert.ok(endIndex >= 0, `"${endType}" event not found`);
    assert.ok(
      startIndex < endIndex,
      `"${startType}" should appear before "${endType}"`
    );

    const middleEvents = this.driverEvents
      .slice(startIndex + 1, endIndex)
      .filter((e) => e.type === middleType);
    assert.ok(
      middleEvents.length > 0,
      `Expected "${middleType}" events between "${startType}" and "${endType}"`
    );
  }
);

// ============================================================================
// Then Steps - Event Data Assertions
// ============================================================================

Then(
  "the {string} event should have a non-empty {string}",
  function (this: AgentXWorld, eventType: string, fieldName: string) {
    const events = this.driverEvents.filter((e) => e.type === eventType);
    assert.ok(events.length > 0, `No "${eventType}" events found`);

    const data = events[0].data as Record<string, unknown>;
    const value = data[fieldName];
    assert.ok(
      value !== undefined && value !== null && value !== "",
      `Expected "${eventType}.${fieldName}" to be non-empty, got: ${JSON.stringify(value)}`
    );
  }
);
