/**
 * Documentation steps for monorepo-level BDD tests
 *
 * Uses agentDocTester to evaluate README quality via AI review.
 */

import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { agentDocTester } from "@agentxjs/devtools/bdd";
import { Before, Given, Then, When } from "@cucumber/cucumber";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = resolve(__dirname, "../..");

const _PACKAGES = [
  "core",
  "agentx",
  "server",
  "mono-driver",
  "node-platform",
  "claude-driver",
  "devtools",
];

// ============================================================================
// State
// ============================================================================

let currentReadme: string = "";
let docRequirements: string[] = [];

Before(() => {
  currentReadme = "";
  docRequirements = [];
});

// ============================================================================
// Given
// ============================================================================

Given("I am a contributor who just joined the project", () => {
  docRequirements.push("Written for someone new to the project");
});

Given("I am a contributor who needs to test an agent locally", () => {
  docRequirements.push("Written for someone who wants to run an agent locally");
});

Given("I am a contributor building a web app with AgentX", () => {
  docRequirements.push("Written for someone embedding AgentX in a web app");
});

Given("I am a contributor who needs to switch LLM providers", () => {
  docRequirements.push("Written for someone switching LLM providers");
});

Given("I am a contributor who needs agent data to persist", () => {
  docRequirements.push("Written for someone setting up data persistence");
});

Given("I am a contributor choosing between claude-driver and mono-driver", () => {
  docRequirements.push("Written for someone deciding between claude-driver and mono-driver");
});

Given("I am a contributor adding a new feature with BDD tests", () => {
  docRequirements.push("Written for someone writing BDD tests");
});

// ============================================================================
// When
// ============================================================================

When("I read {word}\\/README.md", (pkgPath: string) => {
  currentReadme = resolve(MONOREPO_ROOT, pkgPath, "README.md");
  assert.ok(existsSync(currentReadme), `README not found: ${currentReadme}`);
});

// ============================================================================
// Then — AI-evaluated requirements
// ============================================================================

Then("I should understand what Container, Image, Session, Driver, Platform mean", () => {
  docRequirements.push(
    "Clearly explains the 5 core concepts: Container, Image, Session, Driver, Platform"
  );
});

Then("I should know which interface to implement if I want to add a new LLM provider", () => {
  docRequirements.push("Explains the Driver interface for adding new LLM providers");
});

Then("I should know which interface to implement if I want to change storage backend", () => {
  docRequirements.push("Explains the Platform interface for changing storage");
});

Then("I should not need to open any .ts file to understand these concepts", () => {
  docRequirements.push(
    "Concepts are fully explained in the README without requiring reading source code"
  );
});

Then("I should be able to copy-paste a working example that:", (table: any) => {
  const rows = table.hashes();
  for (const row of rows) {
    if (row["code provided"] === "yes") {
      docRequirements.push(`Has a copy-pasteable code example for: ${row.step}`);
    }
  }
});

Then("the example should work with just an API key and no server", () => {
  docRequirements.push("Local mode example works with just an API key, no server needed");
});

Then("I should understand when to use Local mode vs Remote mode", () => {
  docRequirements.push("Explains when to use Local mode vs Remote mode");
});

Then("I should know how to:", (table: any) => {
  const rows = table.hashes();
  for (const row of rows) {
    const task = row.task;
    const hasCode = row["code provided"] === "yes";
    docRequirements.push(
      hasCode ? `Explains how to: ${task} (with code example)` : `Explains how to: ${task}`
    );
  }
});

Then("I should see the full ServerConfig type with all options and defaults", () => {
  docRequirements.push("Shows the full ServerConfig type with all options and their defaults");
});

Then("I should see examples for each supported provider:", (table: any) => {
  const rows = table.hashes();
  for (const row of rows) {
    if (row["example provided"] === "yes") {
      docRequirements.push(`Has a configuration example for provider: ${row.provider}`);
    }
  }
});

Then("I should know how to add MCP servers to the driver", () => {
  docRequirements.push("Explains how to configure MCP servers");
});

Then("I should understand the difference between mono-driver and claude-driver", () => {
  docRequirements.push("Explains the difference between mono-driver and claude-driver");
});

Then("I should see all NodePlatformOptions with defaults", () => {
  docRequirements.push("Shows all NodePlatformOptions with their default values");
});

Then("the first paragraph should clearly state:", (table: any) => {
  const rows = table.hashes();
  for (const row of rows) {
    docRequirements.push(`First paragraph answers: "${row.question}" → "${row.answer}"`);
  }
});

// ============================================================================
// After — Run agentDocTester with accumulated requirements
// ============================================================================

import { After } from "@cucumber/cucumber";

After({ timeout: 120000 }, async () => {
  if (!currentReadme || docRequirements.length === 0) return;

  const result = await agentDocTester({
    files: [currentReadme],
    requirements: docRequirements.join("\n"),
  });

  assert.ok(result.passed, `Documentation review failed:\n${result.output}`);
});
