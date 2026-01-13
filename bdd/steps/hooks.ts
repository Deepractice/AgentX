/**
 * Cucumber Hooks - Setup and teardown
 */

import { After, Before, BeforeAll, AfterAll, setDefaultTimeout } from "@cucumber/cucumber";
import type { AgentXWorld } from "./world";

// Set longer timeout for real API tests (2 minutes)
// This needs to be longer than any internal step timeout
setDefaultTimeout(120000);

BeforeAll(async function () {
  // Global setup if needed
});

AfterAll(async function () {
  // Global teardown if needed
});

Before(async function (this: AgentXWorld) {
  // Reset state before each scenario
  this.collectedEvents = [];
  this.lastResponse = undefined;
});

After(async function (this: AgentXWorld) {
  // Clean up after each scenario
  await this.cleanup();
});
