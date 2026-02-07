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

// Devtools SDK (recommended)
export {
  Devtools,
  createDevtools,
  createVcrCreateDriver,
  type DevtoolsConfig,
  type DriverOptions,
  type VcrCreateDriverConfig,
} from "./Devtools";

// Mock Driver (low-level)
export { MockDriver, createMockDriver } from "./mock/MockDriver";

// Recording Driver (low-level)
export {
  RecordingDriver,
  createRecordingDriver,
  type RecordingDriverOptions,
} from "./recorder/RecordingDriver";

// Environment
export { env } from "./env";

// Types
export type { Fixture, FixtureEvent, MockDriverOptions } from "./types";

// Fixtures
export {
  BUILTIN_FIXTURES,
  SIMPLE_REPLY,
  LONG_REPLY,
  TOOL_CALL,
  ERROR_RESPONSE,
  EMPTY_RESPONSE,
  getFixture,
  listFixtures,
} from "../fixtures";
