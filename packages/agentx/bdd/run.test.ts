/**
 * BDD test runner for agentx package
 *
 * Uses @deepracticex/bdd — Bun-native Cucumber runner.
 * Auto-scans features and step definitions.
 */

import { configure } from "@deepracticex/bdd";

await configure({
  features: ["bdd/journeys/**/*.feature"],
  steps: ["bdd/support/**/*.ts", "bdd/steps/**/*.ts"],
  tags: "not @pending",
  timeout: 30_000,
});
