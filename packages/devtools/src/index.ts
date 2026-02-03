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
 * const devtools = createDevtools({
 *   fixturesDir: "./fixtures",
 *   apiKey: process.env.DEEPRACTICE_API_KEY,
 * });
 *
 * // Has fixture → playback
 * // No fixture → call API, record, save, return MockDriver
 * const driver = await devtools.driver("hello-test", {
 *   message: "Hello!",
 * });
 *
 * driver.connect(consumer, producer);
 * ```
 *
 * ## Low-level APIs
 *
 * ```typescript
 * // MockDriver - playback
 * import { MockDriver } from "@agentxjs/devtools";
 * const driver = new MockDriver({ fixture: myFixture });
 *
 * // RecordingDriver - capture
 * import { createRecordingDriver } from "@agentxjs/devtools";
 * const recorder = createRecordingDriver({ driver: realDriver, name: "test" });
 * ```
 */

// Devtools SDK (recommended)
export { Devtools, createDevtools, type DevtoolsConfig, type DriverOptions } from "./Devtools";

// Mock Driver (low-level)
export { MockDriver } from "./mock/MockDriver";
export { MockDriverFactory, createMockDriverFactory } from "./mock/MockDriverFactory";

// Recording Driver (low-level)
export {
  RecordingDriver,
  createRecordingDriver,
  type RecordingDriverOptions,
} from "./recorder/RecordingDriver";

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
