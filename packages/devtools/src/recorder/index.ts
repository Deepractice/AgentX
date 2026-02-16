/**
 * Recording Driver Module
 *
 * Provides RecordingDriver for capturing LLM events from any driver.
 * Use these recordings as fixtures for MockDriver to test Runtime.
 *
 * Usage:
 * ```typescript
 * import { createRecordingDriver } from "@agentxjs/devtools/recorder";
 *
 * const recorder = createRecordingDriver({
 *   driver: realDriver,
 *   name: "my-scenario",
 * });
 *
 * // After use, save the fixture
 * await recorder.saveFixture("./fixtures/my-scenario.json");
 * ```
 */

export {
  createRecordingDriver,
  RecordingDriver,
  type RecordingDriverOptions,
} from "./RecordingDriver";
