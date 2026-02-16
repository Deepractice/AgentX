/**
 * @agentxjs/devtools
 *
 * Development Tools for AgentX - VCR-style fixture management
 *
 * ## Quick Start (Recommended)
 *
 * ```typescript
 * import { createDevtools } from "@agentxjs/devtools";
 *
 * import { env } from "@agentxjs/devtools";
 *
 * const devtools = createDevtools({
 *   fixturesDir: "./fixtures",
 *   apiKey: env.apiKey,
 * });
 *
 * // Has fixture → playback (MockDriver)
 * // No fixture → call API, record, save, return MockDriver
 * const driver = await devtools.driver("hello-test", {
 *   message: "Hello!",
 * });
 *
 * await driver.initialize();
 * for await (const event of driver.receive(userMessage)) {
 *   console.log(event);
 * }
 * ```
 *
 * ## Low-level APIs
 *
 * ```typescript
 * // MockDriver - playback
 * import { MockDriver, createMockDriver } from "@agentxjs/devtools";
 * const driver = new MockDriver({ fixture: myFixture });
 *
 * // RecordingDriver - capture
 * import { createRecordingDriver } from "@agentxjs/devtools";
 * const recorder = createRecordingDriver({ driver: realDriver, name: "test" });
 * ```
 */

// Fixtures
export {
  BUILTIN_FIXTURES,
  EMPTY_RESPONSE,
  ERROR_RESPONSE,
  getFixture,
  LONG_REPLY,
  listFixtures,
  SIMPLE_REPLY,
  TOOL_CALL,
} from "../fixtures";
// Devtools SDK (recommended)
export {
  createDevtools,
  createVcrCreateDriver,
  Devtools,
  type DevtoolsConfig,
  type DriverOptions,
  type VcrCreateDriverConfig,
} from "./Devtools";
// Environment
export { env } from "./env";
// Mock Driver (low-level)
export { createMockDriver, MockDriver } from "./mock/MockDriver";
// Recording Driver (low-level)
export {
  createRecordingDriver,
  RecordingDriver,
  type RecordingDriverOptions,
} from "./recorder/RecordingDriver";
// Types
export type { Fixture, FixtureEvent, MockDriverOptions } from "./types";
