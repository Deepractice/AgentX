/**
 * Cucumber.js configuration
 *
 * Profiles:
 * - default: Layer 1 tests (excluding @integration, @reliability)
 * - integration: Tests that call real Claude API
 * - reliability: Layer 2 reliability tests
 * - all: Everything including integration
 */

const common = {
  format: ["progress-bar", "html:reports/cucumber-report.html"],
  formatOptions: { snippetInterface: "async-await" },
  import: ["steps/**/*.ts"],
  worldParameters: {
    defaultTimeout: 10000,
  },
};

// Default: Layer 1 basic tests
export default {
  ...common,
  paths: ["features/agentx/**/*.feature", "features/conversation/**/*.feature"],
  tags: "not @integration and not @pending and not @browser and not @stress",
};

// Integration: Tests that call real Claude API
export const integration = {
  ...common,
  tags: "@integration and not @pending",
  worldParameters: {
    defaultTimeout: 60000, // 60s for Claude API calls
  },
};

// Reliability: Layer 2 tests (Queue capabilities)
export const reliability = {
  ...common,
  paths: ["features/reliability/**/*.feature"],
  tags: "not @pending and not @browser and not @stress",
  worldParameters: {
    defaultTimeout: 30000,
  },
};

// All: Everything including integration
export const all = {
  ...common,
  tags: "not @pending and not @browser and not @stress",
  worldParameters: {
    defaultTimeout: 60000,
  },
};

// Layer 1: AgentX local/remote mode
export const agentx = {
  ...common,
  paths: ["features/agentx/**/*.feature"],
  tags: "not @integration and not @pending",
};

// Layer 1: Conversation lifecycle
export const conversation = {
  ...common,
  paths: ["features/conversation/**/*.feature"],
  tags: "not @integration and not @pending",
};

// Layer 1: Local mode only
export const local = {
  ...common,
  paths: ["features/agentx/local-mode.feature"],
  tags: "not @integration and not @pending",
};

// Layer 1: Remote mode only
export const remote = {
  ...common,
  paths: ["features/agentx/remote-mode.feature"],
  tags: "not @integration and not @pending",
};

// Layer 2: Reconnection tests
export const reconnect = {
  ...common,
  paths: ["features/reliability/reconnect.feature"],
  tags: "not @pending and not @browser",
};

// Layer 2: Multi-consumer tests
export const multiconsumer = {
  ...common,
  paths: ["features/reliability/multi-consumer.feature"],
  tags: "not @pending and not @browser",
};

// Layer 2: Delivery guarantee tests
export const delivery = {
  ...common,
  paths: ["features/reliability/delivery.feature"],
  tags: "not @pending and not @stress",
};
