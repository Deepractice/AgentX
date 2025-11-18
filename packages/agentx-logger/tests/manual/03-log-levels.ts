/**
 * Test 3: Log Levels Configuration
 *
 * Tests different log levels and configuration.
 */

import { LoggerFactory, LogLevel } from "../../src";

console.log("\n=== Test 3: Log Levels ===\n");

// Test default level (INFO)
console.log("--- Default Level (INFO) ---");
const defaultLogger = LoggerFactory.getLogger("DefaultLevel");
defaultLogger.debug("This should NOT appear (below INFO)");
defaultLogger.info("This should appear");
defaultLogger.warn("This should appear");
defaultLogger.error("This should appear");

// Configure to DEBUG level
console.log("\n--- Configured to DEBUG level ---");
LoggerFactory.configure({
  defaultLevel: LogLevel.DEBUG,
});

const debugLogger = LoggerFactory.getLogger("DebugLevel");
debugLogger.debug("This should appear now");
debugLogger.info("This should appear");

// Configure to ERROR level only
console.log("\n--- Configured to ERROR level only ---");
LoggerFactory.configure({
  defaultLevel: LogLevel.ERROR,
});

const errorLogger = LoggerFactory.getLogger("ErrorLevel");
errorLogger.debug("This should NOT appear");
errorLogger.info("This should NOT appear");
errorLogger.warn("This should NOT appear");
errorLogger.error("This should appear");

// Test with class using LoggerFactory
console.log("\n--- Testing with class (WARN level) ---");
LoggerFactory.configure({
  defaultLevel: LogLevel.WARN,
});

class NotificationService {
  private logger = LoggerFactory.getLogger(NotificationService);

  sendEmail() {
    this.logger.debug("Preparing email (should NOT appear)");
    this.logger.info("Sending email (should NOT appear)");
    this.logger.warn("Email queue is slow (should appear)");
    this.logger.error(new Error("Email failed"), { recipient: "user@example.com" });
  }
}

const notificationService = new NotificationService();
notificationService.sendEmail();

// Reset to default
LoggerFactory.configure({
  defaultLevel: LogLevel.INFO,
});

console.log("\n✅ Test 3 passed\n");
