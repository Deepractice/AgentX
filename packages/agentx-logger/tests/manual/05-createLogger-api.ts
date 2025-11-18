/**
 * Test 5: createLogger API
 *
 * Tests the convenient createLogger API for non-class scenarios.
 */

import { createLogger, LogLevel } from "../../src";

console.log("\n=== Test 5: createLogger API ===\n");

// Test 1: Simple string name
console.log("--- Simple string name ---");
const moduleLogger = createLogger("MyModule");
moduleLogger.info("Module initialized");
moduleLogger.debug("Module details");

// Test 2: With options
console.log("\n--- With options ---");
const configLogger = createLogger({
  name: "ConfigModule",
  level: LogLevel.DEBUG, // Note: level not yet implemented, using factory default
});
configLogger.info("Config loaded");
configLogger.debug("Config details");

// Test 3: In utility functions
console.log("\n--- In utility functions ---");
function validateData(data: any) {
  const logger = createLogger("utils/validateData");
  logger.info("Validating data", { dataType: typeof data });
  logger.debug("Data contents", { data });
  return true;
}

validateData({ name: "test" });

// Test 4: In facade-style functions
console.log("\n--- In facade functions ---");
function createAgent(id: string) {
  const logger = createLogger("facade/createAgent");
  logger.info("Creating agent", { id });
  logger.debug("Agent configuration initialized");
  return { id };
}

createAgent("agent-001");

// Test 5: Nested module paths
console.log("\n--- Nested module paths ---");
const driverLogger = createLogger("core/agent/AgentDriverBridge");
driverLogger.info("Driver bridge initialized");

const reactorLogger = createLogger("core/agent/AgentStateMachine");
reactorLogger.info("State machine initialized");

const eventBusLogger = createLogger("core/agent/AgentEventBus");
eventBusLogger.info("Event bus initialized");

console.log("\n✅ Test 5 passed\n");
