/**
 * Test 1: Basic @Logger Decorator Usage
 *
 * Tests the decorator-based logger injection (similar to @Slf4j in Spring/Lombok).
 */

import { Logger, type LoggerProvider } from "../../src";

console.log("\n=== Test 1: Basic @Logger Decorator ===\n");

class UserService {
  @Logger()
  private logger!: LoggerProvider;

  createUser(name: string) {
    this.logger.info("Creating user", { name });
    this.logger.debug("User creation details", { timestamp: Date.now() });
    this.logger.info("User created successfully");
  }

  deleteUser(id: number) {
    this.logger.warn("Deleting user", { id });
    this.logger.info("User deleted");
  }
}

class OrderService {
  @Logger({ name: "CustomOrderLogger" })
  private logger!: LoggerProvider;

  processOrder(orderId: string) {
    this.logger.info("Processing order", { orderId });
    this.logger.debug("Order details fetched");
  }
}

// Run tests
const userService = new UserService();
userService.createUser("Alice");
userService.deleteUser(123);

const orderService = new OrderService();
orderService.processOrder("ORDER-001");

console.log("\n✅ Test 1 passed\n");
