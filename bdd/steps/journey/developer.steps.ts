/**
 * Journey Steps - Developer Persona
 *
 * End-to-end workflows for developers using the AgentX SDK.
 * All journeys use VCR recording for reproducible, offline tests.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { resolve } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import type { DataTable } from "@cucumber/cucumber";
import type { AgentXWorld } from "../../support/world";
import type { BusEvent } from "@agentxjs/core/event";

// ============================================================================
// VCR Configuration for Journey Tests
// ============================================================================

const JOURNEY_FIXTURES_DIR = resolve(
  process.cwd(),
  "fixtures/recording/journey"
);

// ============================================================================
// State for developer journey
// ============================================================================

interface DeveloperState {
  containerId?: string;
  imageId?: string;
  agentId?: string;
  sessionId?: string;
  lastReplyText?: string;
  events: BusEvent[];
  unsubscribes: Array<() => void>;
}

const KEY = "__developer";

function getState(world: AgentXWorld): DeveloperState {
  if (!(world as any)[KEY]) {
    (world as any)[KEY] = { events: [], unsubscribes: [] };
  }
  return (world as any)[KEY];
}

// ============================================================================
// Phase 1: Setup
// ============================================================================

Given(
  "a local AgentX environment with provider {string}",
  { timeout: 30000 },
  async function (this: AgentXWorld, provider: string) {
    const { createAgentX } = await import("agentxjs");
    const { createVcrCreateDriver } = await import("@agentxjs/devtools");
    const { createMonoDriver } = await import("@agentxjs/mono-driver");

    const apiKey =
      process.env.ANTHROPIC_API_KEY ||
      process.env.DEEPRACTICE_API_KEY ||
      "test-key";
    const baseUrl = process.env.DEEPRACTICE_BASE_URL;
    const model = process.env.DEEPRACTICE_MODEL || "claude-haiku-4-5-20251001";

    const fixtureName = this.scenarioName;

    const vcrCreateDriver = createVcrCreateDriver({
      fixturesDir: JOURNEY_FIXTURES_DIR,
      getFixtureName: () => fixtureName,
      apiKey,
      baseUrl,
      model,
      createRealDriver: createMonoDriver as any,
      onPlayback: (name) => console.log(`[Journey VCR] Playback: ${name}`),
      onRecording: (name) => console.log(`[Journey VCR] Recording: ${name}`),
      onSaved: (name, count) =>
        console.log(`[Journey VCR] Saved: ${name} (${count} events)`),
    });

    this.localAgentX = await createAgentX({
      createDriver: vcrCreateDriver,
      provider: provider as any,
      dataPath: ".tmp",
    });
  }
);

// ============================================================================
// Phase 2: Create agent
// ============================================================================

When(
  "I create a container {string}",
  async function (this: AgentXWorld, containerId: string) {
    const result = await this.localAgentX!.containers.create(containerId);
    getState(this).containerId = result.containerId;
  }
);

When(
  "I create an image {string} in {string} with prompt {string}",
  async function (
    this: AgentXWorld,
    name: string,
    containerId: string,
    systemPrompt: string
  ) {
    const result = await this.localAgentX!.images.create({
      containerId,
      name,
      systemPrompt,
    });
    const state = getState(this);
    state.imageId = result.record.imageId;
    state.sessionId = result.record.sessionId;
  }
);

When(
  "I create an image {string} in {string} with prompt {string} and mcp servers:",
  async function (
    this: AgentXWorld,
    name: string,
    containerId: string,
    systemPrompt: string,
    table: DataTable
  ) {
    const mcpServers: Record<string, any> = {};
    for (const row of table.hashes()) {
      if (row.url) {
        // HTTP/Streamable HTTP transport
        mcpServers[row.name] = {
          type: "http",
          url: row.url,
        };
      } else {
        // Stdio transport
        const args = row.args ? row.args.split(" ") : undefined;

        // Ensure directories exist for filesystem MCP servers
        if (args) {
          const lastArg = args[args.length - 1];
          if (lastArg && lastArg.startsWith("/") && !lastArg.includes(".")) {
            if (!existsSync(lastArg)) {
              mkdirSync(lastArg, { recursive: true });
            }
          }
        }

        mcpServers[row.name] = {
          command: row.command,
          args,
          env: row.env ? JSON.parse(row.env) : undefined,
        };
      }
    }

    const result = await this.localAgentX!.images.create({
      containerId,
      name,
      systemPrompt,
      mcpServers,
    });
    const state = getState(this);
    state.imageId = result.record.imageId;
    state.sessionId = result.record.sessionId;
  }
);

When(
  "I run the image as an agent",
  { timeout: 30000 },
  async function (this: AgentXWorld) {
    const state = getState(this);
    const result = await this.localAgentX!.agents.create({
      imageId: state.imageId!,
    });
    state.agentId = result.agentId;
  }
);

// ============================================================================
// Phase 3: Chat
// ============================================================================

When(
  "I send message {string}",
  { timeout: 30000 },
  async function (this: AgentXWorld, message: string) {
    const state = getState(this);
    state.events = [];

    const unsub = this.localAgentX!.onAny((event) => {
      state.events.push(event);
    });
    state.unsubscribes.push(unsub);

    await this.localAgentX!.sessions.send(state.agentId!, message);
    await new Promise((r) => setTimeout(r, 200));

    // Extract reply text from text_delta events
    const textDeltas = state.events.filter((e) => e.type === "text_delta");
    state.lastReplyText = textDeltas.map((e) => (e.data as any).text).join("");
  }
);

Then(
  "I should receive a non-empty reply",
  function (this: AgentXWorld) {
    const state = getState(this);
    assert.ok(
      state.lastReplyText && state.lastReplyText.length > 0,
      "Should receive a non-empty reply from the agent"
    );
  }
);

Then(
  "the reply should contain {string}",
  function (this: AgentXWorld, expected: string) {
    const state = getState(this);
    assert.ok(
      state.lastReplyText && state.lastReplyText.includes(expected),
      `Reply should contain "${expected}", got: "${state.lastReplyText}"`
    );
  }
);

Then(
  "the reply should contain a Chinese character",
  function (this: AgentXWorld) {
    const state = getState(this);
    const hasChinese = /[\u4e00-\u9fff]/.test(state.lastReplyText || "");
    assert.ok(
      hasChinese,
      `Reply should contain Chinese characters, got: "${state.lastReplyText}"`
    );
  }
);

// ============================================================================
// Phase 4: Cleanup
// ============================================================================

When("I destroy the agent", async function (this: AgentXWorld) {
  const state = getState(this);
  for (const unsub of state.unsubscribes) {
    unsub();
  }
  state.unsubscribes = [];

  await this.localAgentX!.agents.destroy(state.agentId!);
});

Then(
  "the agent should no longer exist",
  async function (this: AgentXWorld) {
    const state = getState(this);
    const result = await this.localAgentX!.agents.get(state.agentId!);
    assert.ok(!result.exists, "Agent should no longer exist");
  }
);
