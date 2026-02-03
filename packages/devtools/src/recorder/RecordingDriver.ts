/**
 * RecordingDriver - Wraps a real driver to record events
 *
 * Used to capture real LLM API responses and save them as fixtures.
 * These fixtures can then be played back by MockDriver for testing.
 *
 * Usage:
 * ```typescript
 * // Wrap the real Claude driver
 * const realDriver = claudeFactory.createDriver(options);
 * const recorder = createRecordingDriver({
 *   driver: realDriver,
 *   name: "my-scenario",
 *   description: "User asks about weather",
 * });
 *
 * // Use recorder like a normal driver
 * recorder.connect(consumer, producer);
 *
 * // After conversation, save the fixture
 * await recorder.saveFixture("./fixtures/my-scenario.json");
 * ```
 */

import type { Driver } from "@agentxjs/core/driver";
import type { EventConsumer, EventProducer, DriveableEvent } from "@agentxjs/core/event";
import type { Fixture, FixtureEvent } from "../types";
import { createLogger } from "commonxjs/logger";

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
  event: DriveableEvent;
  timestamp: number;
}

/**
 * RecordingDriver - Records events from a real driver
 */
export class RecordingDriver implements Driver {
  readonly name = "RecordingDriver";

  private readonly realDriver: Driver;
  private readonly fixtureName: string;
  private readonly fixtureDescription?: string;

  private recordedEvents: RecordedEvent[] = [];
  private recordingStartTime: number = 0;
  private isRecording = false;

  constructor(options: RecordingDriverOptions) {
    this.realDriver = options.driver;
    this.fixtureName = options.name;
    this.fixtureDescription = options.description;

    logger.info("RecordingDriver created", { name: this.fixtureName });
  }

  /**
   * Connect to EventBus (wraps real driver's connect)
   */
  connect(consumer: EventConsumer, producer: EventProducer): void {
    // Create a recording producer that intercepts all events
    const recordingProducer: EventProducer = {
      emit: (event) => {
        // Record the event
        this.recordEvent(event as DriveableEvent);
        // Forward to the real producer
        producer.emit(event);
      },
      emitBatch: (events) => {
        // Record all events
        for (const event of events) {
          this.recordEvent(event as DriveableEvent);
        }
        // Forward to the real producer
        producer.emitBatch(events);
      },
      emitCommand: (type, data) => {
        // Commands are not recorded (they're requests, not events)
        producer.emitCommand(type, data);
      },
    };

    // Connect the real driver with our recording producer
    this.realDriver.connect(consumer, recordingProducer);

    // Start recording
    this.recordingStartTime = Date.now();
    this.isRecording = true;
    this.recordedEvents = [];

    logger.info("RecordingDriver connected, recording started", {
      name: this.fixtureName,
    });
  }

  /**
   * Disconnect (wraps real driver's disconnect)
   */
  disconnect(): void {
    this.isRecording = false;
    this.realDriver.disconnect();
    logger.info("RecordingDriver disconnected", {
      name: this.fixtureName,
      eventsRecorded: this.recordedEvents.length,
    });
  }

  /**
   * Dispose (wraps real driver's dispose)
   */
  dispose(): void {
    this.isRecording = false;
    this.realDriver.dispose();
    logger.info("RecordingDriver disposed", {
      name: this.fixtureName,
      eventsRecorded: this.recordedEvents.length,
    });
  }

  /**
   * Record an event
   */
  private recordEvent(event: DriveableEvent): void {
    if (!this.isRecording) return;

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
        index: (recorded.event as DriveableEvent & { index?: number }).index,
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
