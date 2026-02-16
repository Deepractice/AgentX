/**
 * RecordingDriver - Wraps a real driver to record events
 *
 * Used to capture real LLM API responses and save them as fixtures.
 * These fixtures can then be played back by MockDriver for testing.
 *
 * Usage:
 * ```typescript
 * import { createClaudeDriver } from "@agentxjs/claude-driver";
 * import { RecordingDriver } from "@agentxjs/devtools/recorder";
 *
 * // Create real driver
 * const realDriver = createClaudeDriver(config);
 *
 * // Wrap with recorder
 * const recorder = new RecordingDriver({
 *   driver: realDriver,
 *   name: "my-scenario",
 *   description: "User asks about weather",
 * });
 *
 * await recorder.initialize();
 *
 * // Use like a normal driver - events are recorded
 * for await (const event of recorder.receive({ content: "Hello" })) {
 *   console.log(event);
 * }
 *
 * // Save the fixture
 * await recorder.saveFixture("./fixtures/my-scenario.json");
 * ```
 */

import type { UserMessage } from "@agentxjs/core/agent";
import type { Driver, DriverState, DriverStreamEvent } from "@agentxjs/core/driver";
import { createLogger } from "commonxjs/logger";
import type { Fixture, FixtureEvent } from "../types";

const logger = createLogger("devtools/RecordingDriver");

/**
 * Options for RecordingDriver
 */
export interface RecordingDriverOptions {
  /**
   * The real driver to wrap
   */
  driver: Driver;

  /**
   * Fixture name for the recording
   */
  name: string;

  /**
   * Description for the recording
   */
  description?: string;
}

/**
 * Recorded event with timing
 */
interface RecordedEvent {
  event: DriverStreamEvent;
  timestamp: number;
}

/**
 * RecordingDriver - Records events from a real driver
 *
 * Implements the new Driver interface by wrapping a real driver
 * and intercepting events from receive().
 */
export class RecordingDriver implements Driver {
  readonly name = "RecordingDriver";

  private readonly realDriver: Driver;
  private readonly fixtureName: string;
  private readonly fixtureDescription?: string;

  private recordedEvents: RecordedEvent[] = [];
  private recordingStartTime: number = 0;

  constructor(options: RecordingDriverOptions) {
    this.realDriver = options.driver;
    this.fixtureName = options.name;
    this.fixtureDescription = options.description;

    logger.info("RecordingDriver created", { name: this.fixtureName });
  }

  // ============================================================================
  // Driver Interface Properties (delegate to real driver)
  // ============================================================================

  get sessionId(): string | null {
    return this.realDriver.sessionId;
  }

  get state(): DriverState {
    return this.realDriver.state;
  }

  // ============================================================================
  // Lifecycle Methods (delegate to real driver)
  // ============================================================================

  async initialize(): Promise<void> {
    await this.realDriver.initialize();
    this.recordingStartTime = Date.now();
    this.recordedEvents = [];
    logger.info("RecordingDriver initialized, recording started", {
      name: this.fixtureName,
    });
  }

  async dispose(): Promise<void> {
    await this.realDriver.dispose();
    logger.info("RecordingDriver disposed", {
      name: this.fixtureName,
      eventsRecorded: this.recordedEvents.length,
    });
  }

  // ============================================================================
  // Core Methods
  // ============================================================================

  /**
   * Receive a user message and return stream of events
   *
   * Wraps the real driver's receive() and records all events.
   */
  async *receive(message: UserMessage): AsyncIterable<DriverStreamEvent> {
    logger.debug("RecordingDriver receiving message", {
      name: this.fixtureName,
    });

    // Call the real driver and intercept events
    for await (const event of this.realDriver.receive(message)) {
      // Record the event
      this.recordEvent(event);

      // Pass through to caller
      yield event;
    }

    logger.debug("RecordingDriver receive completed", {
      name: this.fixtureName,
      eventsRecorded: this.recordedEvents.length,
    });
  }

  /**
   * Interrupt current operation (delegate to real driver)
   */
  interrupt(): void {
    this.realDriver.interrupt();
  }

  // ============================================================================
  // Recording Methods
  // ============================================================================

  /**
   * Record an event
   */
  private recordEvent(event: DriverStreamEvent): void {
    this.recordedEvents.push({
      event,
      timestamp: Date.now(),
    });

    logger.debug("Event recorded", {
      type: event.type,
      totalEvents: this.recordedEvents.length,
    });
  }

  /**
   * Get the recorded fixture
   */
  getFixture(): Fixture {
    const events: FixtureEvent[] = [];
    let lastTimestamp = this.recordingStartTime;

    for (const recorded of this.recordedEvents) {
      const delay = recorded.timestamp - lastTimestamp;
      lastTimestamp = recorded.timestamp;

      events.push({
        type: recorded.event.type,
        delay: Math.max(0, delay),
        data: recorded.event.data,
      });
    }

    return {
      name: this.fixtureName,
      description: this.fixtureDescription,
      recordedAt: this.recordingStartTime,
      events,
    };
  }

  /**
   * Save the recorded fixture to a JSON file
   */
  async saveFixture(filePath: string): Promise<void> {
    const fixture = this.getFixture();
    const json = JSON.stringify(fixture, null, 2);

    // Use dynamic import for Node.js fs
    const { writeFile } = await import("node:fs/promises");
    await writeFile(filePath, json, "utf-8");

    logger.info("Fixture saved", {
      path: filePath,
      name: fixture.name,
      eventCount: fixture.events.length,
    });
  }

  /**
   * Get the number of recorded events
   */
  get eventCount(): number {
    return this.recordedEvents.length;
  }

  /**
   * Clear recorded events (start fresh recording)
   */
  clearRecording(): void {
    this.recordedEvents = [];
    this.recordingStartTime = Date.now();
    logger.debug("Recording cleared");
  }

  /**
   * Get raw recorded events (for debugging)
   */
  getRawEvents(): RecordedEvent[] {
    return [...this.recordedEvents];
  }
}

/**
 * Create a RecordingDriver that wraps a real driver
 */
export function createRecordingDriver(options: RecordingDriverOptions): RecordingDriver {
  return new RecordingDriver(options);
}
