/**
 * Journey Steps - LLM Provider Management
 *
 * Steps for 14-llm-provider.feature scenarios.
 * Tests CRUD operations on ax.llm namespace using local mode.
 */

import { strict as assert } from "node:assert";
import type { DataTable } from "@deepracticex/bdd";
import { Given, Then, When } from "@deepracticex/bdd";
import type { AgentXWorld } from "../support/world";

// ============================================================================
// State for LLM provider tests
// ============================================================================

interface LLMProviderState {
  lastProviderId?: string;
  lastProviderName?: string;
  providerIds: Map<string, string>; // name → id
  listResult?: Array<{ id: string; name: string; vendor: string; protocol: string }>;
}

const KEY = "__llmProvider";

function getState(world: AgentXWorld): LLMProviderState {
  if (!(world as any)[KEY]) {
    (world as any)[KEY] = { providerIds: new Map() };
  }
  return (world as any)[KEY];
}

// ============================================================================
// Background: Setup
// ============================================================================

Given("a local AgentX environment", { timeout: 30000 }, async function (this: AgentXWorld) {
  const { createAgentX } = await import("agentxjs");
  const { createNodePlatform } = await import("@agentxjs/node-platform");
  const { createMockDriver } = await import("@agentxjs/devtools/mock");
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");

  // Use unique temp dir per scenario to avoid data leaking between tests
  const tempDir = mkdtempSync(join(tmpdir(), "agentx-llm-bdd-"));
  const platform = await createNodePlatform({ dataPath: tempDir });
  this.localAgentX = createAgentX({
    platform,
    createDriver: createMockDriver(),
  });
});

// ============================================================================
// Create LLM Provider
// ============================================================================

When("I create an LLM provider:", async function (this: AgentXWorld, table: DataTable) {
  const state = getState(this);
  const rows = table.hashes();
  const params: Record<string, string> = {};
  for (const row of rows) {
    params[row.field] = row.value;
  }

  const result = await this.localAgentX!.llm.create({
    name: params.name,
    vendor: params.vendor,
    protocol: params.protocol as "anthropic" | "openai",
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    model: params.model,
  });

  state.lastProviderId = result.record.id;
  state.lastProviderName = result.record.name;
  state.providerIds.set(result.record.name, result.record.id);
});

Given("I have created LLM providers:", async function (this: AgentXWorld, table: DataTable) {
  const state = getState(this);
  for (const row of table.hashes()) {
    const result = await this.localAgentX!.llm.create({
      name: row.name,
      vendor: row.vendor,
      protocol: row.protocol as "anthropic" | "openai",
      apiKey: `sk-test-${row.name.toLowerCase().replace(/\s+/g, "-")}`,
    });
    state.providerIds.set(row.name, result.record.id);
  }
});

// ============================================================================
// Get / List
// ============================================================================

When("I get the LLM provider by its ID", async function (this: AgentXWorld) {
  const state = getState(this);
  const result = await this.localAgentX!.llm.get(state.lastProviderId!);
  assert.ok(result.record, "LLM provider should exist");
  state.lastProviderName = result.record!.name;
});

When("I list LLM providers", async function (this: AgentXWorld) {
  const state = getState(this);
  const result = await this.localAgentX!.llm.list();
  state.listResult = result.records as any;
});

When("I reload the LLM provider by its ID", async function (this: AgentXWorld) {
  const state = getState(this);
  const result = await this.localAgentX!.llm.get(state.lastProviderId!);
  assert.ok(result.record, "LLM provider should exist after reload");
  state.lastProviderName = result.record!.name;
});

// ============================================================================
// Update
// ============================================================================

When(
  "I update the LLM provider model to {string}",
  async function (this: AgentXWorld, model: string) {
    const state = getState(this);
    await this.localAgentX!.llm.update(state.lastProviderId!, { model });
  }
);

// ============================================================================
// Delete
// ============================================================================

When("I delete the LLM provider", async function (this: AgentXWorld) {
  const state = getState(this);
  await this.localAgentX!.llm.delete(state.lastProviderId!);
});

// ============================================================================
// Default
// ============================================================================

Given("{string} is the default LLM provider", async function (this: AgentXWorld, name: string) {
  const state = getState(this);
  const id = state.providerIds.get(name);
  assert.ok(id, `Provider "${name}" not found in created providers`);
  await this.localAgentX!.llm.setDefault(id);
});

When(
  "I set {string} as the default LLM provider",
  async function (this: AgentXWorld, name: string) {
    const state = getState(this);
    const id = state.providerIds.get(name);
    assert.ok(id, `Provider "${name}" not found in created providers`);
    await this.localAgentX!.llm.setDefault(id);
  }
);

// ============================================================================
// Assertions
// ============================================================================

Then(
  "the LLM provider should be created with name {string}",
  async function (this: AgentXWorld, name: string) {
    const state = getState(this);
    const result = await this.localAgentX!.llm.get(state.lastProviderId!);
    assert.ok(result.record, "LLM provider should exist");
    assert.equal(result.record!.name, name);
  }
);

Then(
  "the LLM provider vendor should be {string}",
  async function (this: AgentXWorld, vendor: string) {
    const state = getState(this);
    const result = await this.localAgentX!.llm.get(state.lastProviderId!);
    assert.equal(result.record!.vendor, vendor);
  }
);

Then(
  "the LLM provider protocol should be {string}",
  async function (this: AgentXWorld, protocol: string) {
    const state = getState(this);
    const result = await this.localAgentX!.llm.get(state.lastProviderId!);
    assert.equal(result.record!.protocol, protocol);
  }
);

Then("the LLM provider name should be {string}", async function (this: AgentXWorld, name: string) {
  const state = getState(this);
  const result = await this.localAgentX!.llm.get(state.lastProviderId!);
  assert.equal(result.record!.name, name);
});

Then(
  "the LLM provider model should be {string}",
  async function (this: AgentXWorld, model: string) {
    const state = getState(this);
    const result = await this.localAgentX!.llm.get(state.lastProviderId!);
    assert.equal(result.record!.model, model);
  }
);

Then(
  "the LLM provider baseUrl should be {string}",
  async function (this: AgentXWorld, baseUrl: string) {
    const state = getState(this);
    const result = await this.localAgentX!.llm.get(state.lastProviderId!);
    assert.equal(result.record!.baseUrl, baseUrl);
  }
);

Then("the list should contain {int} providers", function (this: AgentXWorld, count: number) {
  const state = getState(this);
  assert.equal(state.listResult!.length, count);
});

Then(
  "the list should include {string} with vendor {string}",
  function (this: AgentXWorld, name: string, vendor: string) {
    const state = getState(this);
    const found = state.listResult!.find((p) => p.name === name);
    assert.ok(found, `Provider "${name}" not found in list`);
    assert.equal(found.vendor, vendor);
  }
);

Then("the LLM provider should no longer exist", async function (this: AgentXWorld) {
  const state = getState(this);
  const result = await this.localAgentX!.llm.get(state.lastProviderId!);
  assert.ok(!result.record, "LLM provider should not exist");
});

Then(
  "the default LLM provider should be {string}",
  async function (this: AgentXWorld, name: string) {
    const state = getState(this);
    const result = await this.localAgentX!.llm.getDefault();
    assert.ok(result.record, "Default LLM provider should exist");
    assert.equal(result.record!.name, name);
  }
);
