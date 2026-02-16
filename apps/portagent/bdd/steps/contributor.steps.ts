/**
 * Contributor journey steps for portagent
 *
 * Two modes:
 * - File verification: direct assertions (tech-stack, bootstrap)
 * - UI testing (@ui): accumulate steps → agentUiTester runs them all
 */

import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { agentUiTester, startDevServer, stopDevServer } from "@agentxjs/devtools/bdd";
import { After, AfterAll, Before, BeforeAll, Given, Then, When } from "@cucumber/cucumber";
import { openDatabase } from "commonxjs/sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(__dirname, "../..");
const DEV_SERVER_PORT = 3099;
const BASE_URL = `http://localhost:${DEV_SERVER_PORT}`;

// ============================================================================
// UI Test State (accumulates steps for agentUiTester)
// ============================================================================

let uiInstructions: string[] = [];

// ============================================================================
// Lifecycle
// ============================================================================

BeforeAll({ timeout: 180000 }, async () => {
  // Check if server is already running
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (res.ok) return;
  } catch {
    // Not running, build & start
  }

  // Build first, then start production server (faster than dev)
  const { execSync } = await import("node:child_process");
  execSync("bun run build", { cwd: APP_DIR, stdio: "inherit", timeout: 120000 });

  await startDevServer({
    cwd: APP_DIR,
    port: DEV_SERVER_PORT,
    timeout: 30000,
    args: ["run", "start", "--", "-p", String(DEV_SERVER_PORT)],
  });
});

Before(() => {
  uiInstructions = [];
});

After({ tags: "@ui", timeout: 300000 }, () => {
  if (uiInstructions.length === 0) return;

  const prompt = [
    `Base URL: ${BASE_URL}`,
    "",
    "Test the following scenario step by step:",
    ...uiInstructions,
  ].join("\n");

  const headed = process.env.HEADED === "true" || !process.env.CI;
  const result = agentUiTester(prompt, { headed });
  assert.ok(result.passed, `UI test failed:\n${result.output}`);
});

AfterAll(() => {
  stopDevServer();
});

// ============================================================================
// File Verification Steps (non-UI)
// ============================================================================

Given("the portagent app is configured", () => {
  assert.ok(existsSync(resolve(APP_DIR, "package.json")));
});

Given("the portagent project", () => {
  assert.ok(existsSync(resolve(APP_DIR, "package.json")));
});

Then("package.json should have {string} dependency", (dep: string) => {
  const pkg = JSON.parse(readFileSync(resolve(APP_DIR, "package.json"), "utf-8"));
  assert.ok(pkg.dependencies?.[dep] || pkg.devDependencies?.[dep], `Missing dependency: ${dep}`);
});

Then("package.json should have {string} devDependency", (dep: string) => {
  const pkg = JSON.parse(readFileSync(resolve(APP_DIR, "package.json"), "utf-8"));
  assert.ok(pkg.devDependencies?.[dep], `Missing devDependency: ${dep}`);
});

Then("{string} should exist", (filePath: string) => {
  assert.ok(existsSync(resolve(APP_DIR, filePath)), `File not found: ${filePath}`);
});

// ============================================================================
// Bootstrap Steps
// ============================================================================

When("I start the portagent dev server", () => {
  // Dev server started in BeforeAll
});

Then("the server should be running on port {int}", async (port: number) => {
  const res = await fetch(`http://localhost:${port}/api/health`);
  assert.ok(res.ok, `Server not responding on port ${port}`);
});

// ============================================================================
// Auth System Steps (@ui — accumulated for agentUiTester)
// ============================================================================

function resetDatabase() {
  // Open the same db file the server uses and clear all tables.
  // SQLite supports concurrent access — this works while server is running.
  const dbPath = process.env.DATABASE_PATH || join(APP_DIR, "data", "app.db");
  const db = openDatabase(dbPath);
  db.exec("DELETE FROM invite_codes");
  db.exec("DELETE FROM users");
  db.exec("DELETE FROM system_config");
  db.close();
}

Given("a fresh installation", () => {
  resetDatabase();
  uiInstructions.push("Starting from a fresh installation (database was just reset)");
});

Given("the system has admin {string} with password {string}", (email: string, password: string) => {
  resetDatabase();
  uiInstructions.push(
    `First, set up admin account: navigate to ${BASE_URL}/setup, fill email "${email}" and password "${password}", click Setup, verify redirect to /`,
    "Then log out (click Logout button or clear session)"
  );
});

Given("I am not logged in", () => {
  uiInstructions.push("Ensure not logged in (clear cookies if needed)");
});

Given("I am logged in as admin {string}", (email: string) => {
  resetDatabase();
  uiInstructions.push(
    `Set up admin: navigate to ${BASE_URL}/setup, fill email "${email}" and password "admin123", click Setup`,
    "Verify logged in as admin (should see Admin badge or Manage Invites)"
  );
});

Given("I am logged in as user {string}", (email: string) => {
  resetDatabase();
  uiInstructions.push(
    `First set up admin: navigate to ${BASE_URL}/setup, fill email "admin@test.com" password "admin123", click Setup`,
    `Then generate invite code: go to /admin/invites, click Generate, note the invite code`,
    `Then logout`,
    `Then sign up as user: go to /signup, fill invite code, email "${email}", password "user123", click Sign Up`,
    "Verify logged in as regular user (no Admin badge)"
  );
});

// ============================================================================
// Shared UI When/Then Steps
// ============================================================================

When("I visit the homepage", () => {
  uiInstructions.push(`Navigate to ${BASE_URL}`);
});

When("I visit {string}", (path: string) => {
  uiInstructions.push(`Navigate to ${BASE_URL}${path}`);
});

When("I fill in email {string}", (email: string) => {
  uiInstructions.push(`Fill in the email field with "${email}"`);
});

When("I fill in password {string}", (password: string) => {
  uiInstructions.push(`Fill in the password field with "${password}"`);
});

When("I click {string}", (buttonText: string) => {
  uiInstructions.push(`Click the "${buttonText}" button`);
});

When("I refresh the page", () => {
  uiInstructions.push("Refresh the page");
});

When("I copy the invite code", () => {
  uiInstructions.push("Copy/note the displayed invite code");
});

When("I paste the invite code", () => {
  uiInstructions.push("Paste the invite code into the invite code field");
});

When("I logout", () => {
  uiInstructions.push("Click Logout");
});

When("I click the sidebar toggle", () => {
  uiInstructions.push("Click the sidebar toggle button");
});

When("I type {string} in the prompt", (text: string) => {
  uiInstructions.push(`Type "${text}" in the prompt input`);
});

When("I press Enter", () => {
  uiInstructions.push("Press Enter");
});

When("I click the first session", () => {
  uiInstructions.push("Click the first session in the sidebar");
});

// ============================================================================
// Shared UI Then Steps
// ============================================================================

Then("I should be on {string}", (path: string) => {
  uiInstructions.push(`Verify the current URL path is "${path}"`);
});

Then("I should still be on {string}", (path: string) => {
  uiInstructions.push(`Verify still on "${path}"`);
});

Then("I should be redirected to {string}", (path: string) => {
  uiInstructions.push(`Verify redirected to "${path}"`);
});

Then("I should see {string}", (text: string) => {
  uiInstructions.push(`Verify the text "${text}" is visible on the page`);
});

Then("I should see {string} prompt", (text: string) => {
  uiInstructions.push(`Verify a "${text}" prompt/placeholder is visible`);
});

Then("I should NOT see {string}", (text: string) => {
  uiInstructions.push(`Verify the text "${text}" is NOT visible on the page`);
});

Then("I should be logged in as {string}", (role: string) => {
  uiInstructions.push(`Verify logged in as "${role}" (check for role indicator)`);
});

Then("I should see the chat interface", () => {
  uiInstructions.push("Verify the chat interface is visible");
});

Then("I should see a new invite code", () => {
  uiInstructions.push("Verify a new invite code is displayed");
});

Then("I should see a collapsible sidebar", () => {
  uiInstructions.push("Verify a collapsible sidebar is visible");
});

Then("I should see a main conversation area", () => {
  uiInstructions.push("Verify a main conversation area is visible");
});

Then("I should see a prompt input at the bottom", () => {
  uiInstructions.push("Verify a prompt input is at the bottom");
});

Then("the sidebar should collapse", () => {
  uiInstructions.push("Verify the sidebar has collapsed");
});

Then("the main area should expand", () => {
  uiInstructions.push("Verify the main area has expanded");
});

Then("the sidebar should expand", () => {
  uiInstructions.push("Verify the sidebar has expanded");
});

Then("my message should appear in conversation", () => {
  uiInstructions.push("Verify my message appears in the conversation");
});

Then("the input should be cleared", () => {
  uiInstructions.push("Verify the input is cleared");
});

Then("this session should appear in sidebar", () => {
  uiInstructions.push("Verify this session appears in the sidebar");
});

Then("the conversation area should be empty", () => {
  uiInstructions.push("Verify the conversation area is empty");
});

Then("I should see two sessions in sidebar", () => {
  uiInstructions.push("Verify there are two sessions in the sidebar");
});

Then("I should see {string} in conversation", (text: string) => {
  uiInstructions.push(`Verify "${text}" appears in the conversation`);
});

Then("I should see {string} in sidebar", (text: string) => {
  uiInstructions.push(`Verify "${text}" is visible in the sidebar`);
});

Then("I should NOT see {string} in sidebar", (text: string) => {
  uiInstructions.push(`Verify "${text}" is NOT visible in the sidebar`);
});

Then("I should see {string} option", (text: string) => {
  uiInstructions.push(`Verify "${text}" option is visible`);
});

Then("I should see my email in sidebar", () => {
  uiInstructions.push("Verify user email is visible in the sidebar");
});

Then("I should see logout option", () => {
  uiInstructions.push("Verify logout option is visible");
});

Then("{string} should appear in conversation", (text: string) => {
  uiInstructions.push(`Verify "${text}" appears in the conversation`);
});

// ============================================================================
// System Settings Steps (06)
// ============================================================================

When("I fill in API key {string}", (key: string) => {
  uiInstructions.push(`Fill in the API Key field with "${key}"`);
});

When("I fill in model {string}", (model: string) => {
  uiInstructions.push(`Fill in the Model field with "${model}"`);
});

When("I fill in system prompt {string}", (prompt: string) => {
  uiInstructions.push(`Fill in the System Prompt field with "${prompt}"`);
});

When("I fill in server name {string}", (name: string) => {
  uiInstructions.push(`Fill in the server name field with "${name}"`);
});

When("I fill in command {string}", (cmd: string) => {
  uiInstructions.push(`Fill in the command field with "${cmd}"`);
});

When("I fill in args {string}", (args: string) => {
  uiInstructions.push(`Fill in the args field with "${args}"`);
});

Given("the system has MCP server {string}", (name: string) => {
  uiInstructions.push(`Precondition: MCP server "${name}" should already be configured`);
});

When("I click {string} on {string}", (action: string, target: string) => {
  uiInstructions.push(`Click "${action}" on the "${target}" item`);
});

// ============================================================================
// Agent Connection Steps (05)
// ============================================================================

Then("I should see an AI response in conversation", () => {
  uiInstructions.push(
    "Wait for an AI/assistant response to appear in the conversation (may take a few seconds for streaming to complete)"
  );
});

Then("I should see the response appearing progressively", () => {
  uiInstructions.push(
    "Verify the AI response text appears progressively (streaming), not all at once"
  );
});
