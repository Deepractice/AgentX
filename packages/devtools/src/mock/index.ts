/**
 * Mock Driver Module
 *
 * Provides MockDriver for playback testing with fixtures.
 *
 * Usage:
 * ```typescript
 * import { MockDriver, createMockDriver } from "@agentxjs/devtools/mock";
 *
 * // Simple usage
 * const driver = new MockDriver({ fixture: "simple-reply" });
 * await driver.initialize();
 * for await (const event of driver.receive({ content: "Hello" })) {
 *   console.log(event);
 * }
 *
 * // Factory usage (for Provider)
 * const createDriver = createMockDriver({ fixture: "simple-reply" });
 * const driver = createDriver(config);
 * ```
 */

export { createMockDriver, MockDriver } from "./MockDriver";
