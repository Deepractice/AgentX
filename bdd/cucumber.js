/**
 * Cucumber.js configuration
 *
 * Usage:
 *   bun bdd                           # All tests (excluding @integration, @browser, @stress)
 *   bun bdd --tags @local             # Only local mode tests
 *   bun bdd --tags @reliability       # Only reliability tests
 *   bun bdd --tags "@container"       # Only container tests
 *   bun bdd --tags "not @server"      # Exclude server tests
 */

export default {
  format: ["progress-bar", "html:reports/cucumber-report.html"],
  formatOptions: { snippetInterface: "async-await" },
  import: ["steps/**/*.ts"],
  paths: ["features/**/*.feature"],
  tags: "not @integration and not @pending and not @browser and not @stress",
  worldParameters: {
    defaultTimeout: 30000,
  },
};
