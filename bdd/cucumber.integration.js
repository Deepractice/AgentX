/**
 * Cucumber.js configuration for integration tests
 *
 * Usage:
 *   bun test:bdd --tags @integration
 *   bun test:bdd --tags @capture-events
 *   bun test:bdd --tags @disconnect-recovery
 */

export default {
  format: ["progress-bar", "html:reports/cucumber-integration-report.html"],
  formatOptions: { snippetInterface: "async-await" },
  // Only load necessary step definitions for integration tests (avoid duplicates with mock.steps.ts)
  import: [
    "steps/hooks.ts",
    "steps/world.ts",
    "steps/conversation.steps.ts",
    "steps/integration.steps.ts",
  ],
  paths: ["features/integration/**/*.feature"],
  // No default tag exclusions for integration tests
  worldParameters: {
    defaultTimeout: 120000, // 2 minutes for real API (network can be slow)
  },
};
