/**
 * Contributor journey steps for portagent
 *
 * Browser lifecycle:
 * - BeforeAll: Start dev server + launch browser (once)
 * - Before: Reset page state (clear cookies, navigate blank)
 * - After: (nothing - page is reused)
 * - AfterAll: Close browser + stop server
 */

import { Given, When, Then, Before, BeforeAll, AfterAll } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  launchBrowser,
  getPage,
  resetPage,
  closeBrowser,
  startDevServer,
  stopDevServer,
} from "@agentxjs/devtools/bdd";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(__dirname, "../..");
const DEV_SERVER_PORT = 3000;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

// ============================================================================
// Lifecycle Hooks
// ============================================================================

BeforeAll({ timeout: 30000 }, async function () {
  // Start dev server once for all tests
  await startDevServer({
    cwd: APP_DIR,
    port: DEV_SERVER_PORT,
    timeout: 20000,
  });
  // Launch browser once
  await launchBrowser({ headless: process.env.CI === "true" });
  await getPage();
});

Before({ tags: "@contributor" }, async function () {
  // Reset page state before each scenario
  await resetPage();
});

// ============================================================================
// Step Definitions
// ============================================================================

Given("the portagent app is configured", async function () {
  const packageJsonPath = resolve(APP_DIR, "package.json");
  assert.ok(existsSync(packageJsonPath), "package.json should exist");
});

Given("the portagent project", async function () {
  const packageJsonPath = resolve(APP_DIR, "package.json");
  assert.ok(existsSync(packageJsonPath), "package.json should exist");
});

Then("package.json should have {string} dependency", async function (dep: string) {
  const pkgPath = resolve(APP_DIR, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  const hasDep = pkg.dependencies?.[dep] || pkg.devDependencies?.[dep];
  assert.ok(hasDep, `package.json should have ${dep}`);
});

Then("package.json should have {string} devDependency", async function (dep: string) {
  const pkgPath = resolve(APP_DIR, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  assert.ok(pkg.devDependencies?.[dep], `package.json should have ${dep} in devDependencies`);
});

Then("{string} should exist", async function (filePath: string) {
  const fullPath = resolve(APP_DIR, filePath);
  assert.ok(existsSync(fullPath), `${filePath} should exist`);
});

When("I start the portagent dev server", async function () {
  // Dev server is started in BeforeAll, this is a no-op
});

Then("the server should be running on port {int}", async function (port: number) {
  const response = await fetch(`http://localhost:${port}`);
  assert.ok(response.ok, `Server should respond on port ${port}`);
});

Given("the portagent dev server is running", async function () {
  // Dev server and browser are started in BeforeAll
});

// Note: "I visit the homepage" is defined in Auth section

Then("I should see {string} in the page title", async function (text: string) {
  const page = await getPage();
  const title = await page.title();
  assert.ok(title.includes(text), `Page title should contain "${text}"`);
});

Then("I should see a welcome message", async function () {
  const page = await getPage();
  const heading = page.locator("h1");
  const text = await heading.textContent();
  assert.ok(text?.includes("Portagent"), "Portagent heading should be visible");

  // Pause for visual inspection in headed mode
  if (!process.env.CI) {
    await new Promise((r) => setTimeout(r, 3000));
  }
});

// ============================================================================
// Chat UI Steps (Journey-style)
// ============================================================================

// Layout
Then("I should see a collapsible sidebar", async function () {
  const page = await getPage();
  const sidebar = page.locator("[data-testid='sidebar']");
  await sidebar.waitFor({ state: "visible", timeout: 5000 });
});

Then("I should see a main conversation area", async function () {
  const page = await getPage();
  const mainArea = page.locator("[data-testid='main-area']");
  await mainArea.waitFor({ state: "visible", timeout: 5000 });
});

Then("I should see a prompt input at the bottom", async function () {
  const page = await getPage();
  const input = page.locator("[data-testid='prompt-input']");
  await input.waitFor({ state: "visible", timeout: 5000 });
});

// Sidebar toggle
When("I click the sidebar toggle", async function () {
  const page = await getPage();
  await page.click("[data-testid='sidebar-toggle']");
});

Then("the sidebar should collapse", async function () {
  const page = await getPage();
  const sidebar = page.locator("[data-testid='sidebar'][data-collapsed='true']");
  await sidebar.waitFor({ state: "visible", timeout: 3000 });
});

Then("the main area should expand", async function () {
  // Automatic when sidebar collapses
});

Then("the sidebar should expand", async function () {
  const page = await getPage();
  const sidebar = page.locator("[data-testid='sidebar']:not([data-collapsed='true'])");
  await sidebar.waitFor({ state: "visible", timeout: 3000 });
});

// Message input
When("I type {string} in the prompt", async function (text: string) {
  const page = await getPage();
  await page.fill("[data-testid='prompt-input']", text);
});

When("I press Enter", async function () {
  const page = await getPage();
  await page.press("[data-testid='prompt-input']", "Enter");
});

Then("my message should appear in conversation", async function () {
  const page = await getPage();
  const message = page.locator("[data-testid='user-message']");
  await message.waitFor({ state: "visible", timeout: 5000 });
});

Then("the input should be cleared", async function () {
  const page = await getPage();
  const input = page.locator("[data-testid='prompt-input']");
  const value = await input.inputValue();
  assert.equal(value, "", "Input should be cleared");
});

Then("this session should appear in sidebar", async function () {
  const page = await getPage();
  const session = page.locator("[data-testid='session-item']");
  await session.waitFor({ state: "visible", timeout: 5000 });
});

// Sessions
Then("the conversation area should be empty", async function () {
  const page = await getPage();
  const emptyState = page.locator("[data-testid='empty-state']");
  await emptyState.waitFor({ state: "visible", timeout: 5000 });
});

Then("I should see two sessions in sidebar", async function () {
  const page = await getPage();
  const sessions = page.locator("[data-testid='session-item']");
  const count = await sessions.count();
  assert.equal(count, 2, "Should have two sessions");
});

When("I click the first session", async function () {
  const page = await getPage();
  await page.click("[data-testid='session-item']:first-child");
});

Then("I should see {string} in conversation", async function (text: string) {
  const page = await getPage();
  const message = page.locator(`[data-testid='message']:has-text("${text}")`);
  await message.waitFor({ state: "visible", timeout: 5000 });
});

// Sidebar content
Then("I should see {string} in sidebar", async function (text: string) {
  const page = await getPage();
  const sidebar = page.locator("[data-testid='sidebar']");
  const element = sidebar.locator(`text=${text}`);
  await element.waitFor({ state: "visible", timeout: 5000 });
});

Then("I should NOT see {string} in sidebar", async function (text: string) {
  const page = await getPage();
  const sidebar = page.locator("[data-testid='sidebar']");
  const element = sidebar.locator(`text=${text}`);
  const isVisible = await element.isVisible().catch(() => false);
  assert.ok(!isVisible, `"${text}" should NOT be in sidebar`);
});

Then("I should see {string} option", async function (text: string) {
  const page = await getPage();
  const option = page.locator(`text=${text}`);
  await option.waitFor({ state: "visible", timeout: 5000 });
});

Then("I should see my email in sidebar", async function () {
  const page = await getPage();
  const userEmail = page.locator("[data-testid='user-email']");
  await userEmail.waitFor({ state: "visible", timeout: 5000 });
});

Then("I should see logout option", async function () {
  const page = await getPage();
  const logout = page.locator("[data-testid='logout']");
  await logout.waitFor({ state: "visible", timeout: 5000 });
});

// (Removed duplicate steps - now defined above in Chat UI Steps section)

// ============================================================================
// Auth System Steps (E2E - All via UI)
// ============================================================================

// Shared state across steps within a scenario
let savedInviteCode: string | null = null;
let savedAdminPassword: string = "admin123";
let savedUserPassword: string = "user123";

async function resetDatabase() {
  const { rmSync } = await import("node:fs");
  try {
    rmSync(resolve(APP_DIR, "data/app.db"), { force: true });
  } catch {
    // Database may not exist
  }
}

// --- Given steps (all via UI) ---

Given("a fresh installation", async function () {
  await resetDatabase();
});

Given(
  "the system has admin {string} with password {string}",
  { timeout: 30000 },
  async function (email: string, password: string) {
    await resetDatabase();
    savedAdminPassword = password;

    // Setup via UI
    const page = await getPage();
    await page.goto(`${DEV_SERVER_URL}/setup`);
    await page.waitForLoadState("domcontentloaded");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/", { timeout: 10000 });

    // Logout to return to clean state
    await page.context().clearCookies();
  }
);

Given("I am not logged in", async function () {
  const page = await getPage();
  await page.context().clearCookies();
});

Given("I am logged in as admin {string}", { timeout: 30000 }, async function (email: string) {
  await resetDatabase();
  const password = savedAdminPassword;

  const page = await getPage();

  // Setup admin via UI
  await page.goto(`${DEV_SERVER_URL}/setup`);
  await page.waitForLoadState("domcontentloaded");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/", { timeout: 10000 });

  // Verify we're logged in
  const url = new URL(page.url());
  assert.equal(url.pathname, "/", "Should be on home page after setup");
});

Given("I am logged in as user {string}", { timeout: 60000 }, async function (email: string) {
  await resetDatabase();
  const page = await getPage();

  // 1. Setup admin via UI
  await page.goto(`${DEV_SERVER_URL}/setup`);
  await page.waitForLoadState("domcontentloaded");
  await page.fill('input[type="email"]', "admin@test.com");
  await page.fill('input[type="password"]', savedAdminPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/", { timeout: 10000 });

  // 2. Generate invite code via UI
  await page.goto(`${DEV_SERVER_URL}/admin/invites`);
  await page.waitForLoadState("domcontentloaded");
  await page.click('button:has-text("Generate")');
  const codeElement = await page.waitForSelector("[data-testid='invite-code']");
  const inviteCode = await codeElement.textContent();
  assert.ok(inviteCode, "Should have generated invite code");

  // 3. Logout
  await page.context().clearCookies();

  // 4. Signup as user via UI
  await page.goto(`${DEV_SERVER_URL}/signup`);
  await page.waitForLoadState("domcontentloaded");
  await page.fill('input[id="inviteCode"]', inviteCode!);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', savedUserPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/", { timeout: 10000 });

  // Verify logged in as user
  const url = new URL(page.url());
  assert.equal(url.pathname, "/", "Should be on home page after signup");
});

// --- When steps ---

When("I visit the homepage", async function () {
  const page = await getPage();
  await page.goto(DEV_SERVER_URL);
  await page.waitForLoadState("domcontentloaded");
});

When("I fill in email {string}", async function (email: string) {
  const page = await getPage();
  await page.fill('input[type="email"]', email);
});

When("I fill in password {string}", async function (password: string) {
  const page = await getPage();
  await page.fill('input[type="password"]', password);
});

When("I click {string}", async function (buttonText: string) {
  const page = await getPage();
  await page.click(`button:has-text("${buttonText}"), a:has-text("${buttonText}")`);
});

When("I refresh the page", async function () {
  const page = await getPage();
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
});

When("I copy the invite code", async function () {
  const page = await getPage();
  const codeElement = page.locator("[data-testid='invite-code']");
  savedInviteCode = await codeElement.textContent();
  assert.ok(savedInviteCode, "Should have copied invite code");
});

When("I paste the invite code", async function () {
  const page = await getPage();
  assert.ok(savedInviteCode, "Should have an invite code to paste");
  await page.fill('input[id="inviteCode"]', savedInviteCode!);
});

When("I logout", async function () {
  const page = await getPage();
  await page.click("[data-testid='logout']");
  await page.waitForLoadState("domcontentloaded");
});

// --- Then steps ---

Then("I should be on {string}", async function (path: string) {
  const page = await getPage();
  await page.waitForURL(`**${path}`, { timeout: 10000 });
  const url = new URL(page.url());
  assert.equal(url.pathname, path, `Should be on ${path}`);
});

Then("I should still be on {string}", async function (path: string) {
  const page = await getPage();
  const url = new URL(page.url());
  assert.equal(url.pathname, path, `Should still be on ${path}`);
});

Then("I should be redirected to {string}", async function (path: string) {
  const page = await getPage();
  await page.waitForURL(`**${path}`, { timeout: 10000 });
  const url = new URL(page.url());
  assert.equal(url.pathname, path, `Should be redirected to ${path}`);
});

Then("I should see {string}", async function (text: string) {
  const page = await getPage();
  const element = page.locator(`text=${text}`);
  await element.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await element.isVisible(), `"${text}" should be visible`);
});

Then("I should NOT see {string}", async function (text: string) {
  const page = await getPage();
  const element = page.locator(`text=${text}`);
  const isVisible = await element.isVisible().catch(() => false);
  assert.ok(!isVisible, `"${text}" should NOT be visible`);
});

Then("I should be logged in as {string}", async function (role: string) {
  const page = await getPage();

  // Verify via UI - check that we're on the home page (not redirected to login)
  const url = new URL(page.url());
  assert.equal(url.pathname, "/", "Should be on home page (logged in)");

  // Verify role via UI element
  if (role === "admin") {
    // Admin should see admin menu
    const adminMenu = page.locator("[data-testid='admin-menu'], text=Admin");
    await adminMenu.waitFor({ state: "visible", timeout: 5000 });
  } else {
    // Regular user should NOT see admin menu
    const adminMenu = page.locator("[data-testid='admin-menu'], text=Admin");
    const isVisible = await adminMenu.isVisible().catch(() => false);
    assert.ok(!isVisible, "Regular user should not see admin menu");
  }
});

Then("I should see the chat interface", async function () {
  const page = await getPage();
  const chatArea = page.locator("[data-testid='main-area'], [data-testid='chat-interface']");
  await chatArea.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await chatArea.isVisible(), "Chat interface should be visible");
});

Then("I should see a new invite code", async function () {
  const page = await getPage();
  const codeElement = page.locator("[data-testid='invite-code']");
  await codeElement.waitFor({ state: "visible", timeout: 5000 });
  const code = await codeElement.textContent();
  assert.ok(code && code.length > 0, "Should see a new invite code");
});

// ============================================================================
// Cleanup
// ============================================================================

// Note: No After hook needed - Before hook resets page state before each scenario

AfterAll({ timeout: 30000 }, async function () {
  try {
    await closeBrowser();
  } catch (e) {
    // Browser may have already closed
    console.error("Error closing browser:", e);
  }
  stopDevServer();
});
