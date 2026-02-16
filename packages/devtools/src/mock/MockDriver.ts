/**
 * MockDriver - Mock Driver for Testing
 *
 * Plays back recorded fixtures when receiving messages.
 * Implements the new Driver interface with receive() returning AsyncIterable.
 *
 * Usage:
 * ```typescript
 * const driver = new MockDriver({
 *   fixture: "simple-reply",
 * });
 *
 * await driver.initialize();
 *
 * for await (const event of driver.receive({ content: "Hello" })) {
 *   if (event.type === "text_delta") {
 *     console.log(event.data.text);
 *   }
 * }
 *
 * await driver.dispose();
 * ```
 */

import type { UserMessage } from "@agentxjs/core/agent";
import type { Driver, DriverConfig, DriverState, DriverStreamEvent } from "@agentxjs/core/driver";
import { createLogger } from "commonxjs/logger";
import { BUILTIN_FIXTURES } from "../../fixtures";
import type { Fixture, FixtureEvent, MockDriverOptions } from "../types";

const logger = createLogger("devtools/MockDriver");

/**
 * MockDriver - Playback driver for testing
 *
 * Implements the new Driver interface:
 * - receive() returns AsyncIterable<DriverStreamEvent>
 * - Clear input/output boundaries for testing
 */
export class MockDriver implements Driver {
  readonly name = "MockDriver";

  private _sessionId: string | null = null;
  private _state: DriverState = "idle";

  private readonly config: DriverConfig | null;
  private readonly options: MockDriverOptions;
  private readonly fixtures: Map<string, Fixture>;
  private currentFixture: Fixture;

  // For interrupt handling
  private isInterrupted = false;

  // Event cursor for multi-turn conversations
  private eventCursor = 0;

  /**
   * Create a MockDriver
   *
   * @param options - MockDriverOptions or DriverConfig
   * @param mockOptions - MockDriverOptions if first param is DriverConfig
   */
  constructor(optionsOrConfig: MockDriverOptions | DriverConfig, mockOptions?: MockDriverOptions) {
    // Detect which constructor form is being used
    if (mockOptions !== undefined || "apiKey" in optionsOrConfig) {
      // Factory mode: (DriverConfig, MockDriverOptions)
      this.config = optionsOrConfig as DriverConfig;
      const opts = mockOptions || {};
      this.options = {
        defaultDelay: 10,
        speedMultiplier: 0,
        ...opts,
      };
    } else {
      // Simple mode: (MockDriverOptions)
      this.config = null;
      const opts = optionsOrConfig as MockDriverOptions;
      this.options = {
        defaultDelay: 10,
        speedMultiplier: 0,
        ...opts,
      };
    }

    // Initialize fixtures
    this.fixtures = new Map(BUILTIN_FIXTURES);
    if (this.options.fixtures) {
      for (const [name, fixture] of this.options.fixtures) {
        this.fixtures.set(name, fixture);
      }
    }

    // Set initial fixture
    this.currentFixture = this.resolveFixture(this.options.fixture || "simple-reply");

    logger.debug("MockDriver created", {
      fixture: this.currentFixture.name,
      agentId: this.config?.agentId,
    });
  }

  // ============================================================================
  // Driver Interface Properties
  // ============================================================================

  get sessionId(): string | null {
    return this._sessionId;
  }

  get state(): DriverState {
    return this._state;
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  /**
   * Initialize the Driver
   */
  async initialize(): Promise<void> {
    if (this._state !== "idle") {
      throw new Error(`Cannot initialize: MockDriver is in "${this._state}" state`);
    }

    // Generate a mock session ID
    this._sessionId = `mock-session-${Date.now()}`;

    logger.debug("MockDriver initialized", {
      sessionId: this._sessionId,
      fixture: this.currentFixture.name,
    });
  }

  /**
   * Dispose and cleanup resources
   */
  async dispose(): Promise<void> {
    if (this._state === "disposed") {
      return;
    }

    this._state = "disposed";
    this.isInterrupted = true;

    logger.debug("MockDriver disposed");
  }

  // ============================================================================
  // Core Methods
  // ============================================================================

  /**
   * Receive a user message and return stream of events
   *
   * Plays back the current fixture as DriverStreamEvent.
   *
   * @param message - User message (ignored for playback)
   * @returns AsyncIterable of stream events
   */
  async *receive(_message: UserMessage): AsyncIterable<DriverStreamEvent> {
    if (this._state === "disposed") {
      throw new Error("Cannot receive: MockDriver is disposed");
    }

    if (this._state === "active") {
      throw new Error("Cannot receive: MockDriver is already processing a message");
    }

    this._state = "active";
    this.isInterrupted = false;

    const { speedMultiplier = 0, defaultDelay = 10 } = this.options;
    const events = this.currentFixture.events;

    try {
      // Start from cursor position and play until message_stop
      while (this.eventCursor < events.length) {
        const fixtureEvent = events[this.eventCursor];
        this.eventCursor++;

        // Check for interrupt
        if (this.isInterrupted) {
          yield {
            type: "interrupted",
            timestamp: Date.now(),
            data: { reason: "user" },
          };
          break;
        }

        // Apply delay
        const delay = fixtureEvent.delay || defaultDelay;
        if (delay > 0 && speedMultiplier > 0) {
          await this.sleep(delay * speedMultiplier);
        }

        // Convert and yield event
        const event = this.convertFixtureEvent(fixtureEvent);
        if (event) {
          yield event;
        }

        // Stop at message_stop (end of one turn)
        if (fixtureEvent.type === "message_stop") {
          break;
        }
      }
    } finally {
      this._state = "idle";
    }
  }

  /**
   * Interrupt current operation
   */
  interrupt(): void {
    if (this._state !== "active") {
      logger.debug("Interrupt called but no active operation");
      return;
    }

    logger.debug("MockDriver interrupted");
    this.isInterrupted = true;
  }

  // ============================================================================
  // Fixture Management
  // ============================================================================

  /**
   * Set the fixture to use for next playback
   */
  setFixture(fixture: string | Fixture): void {
    this.currentFixture = this.resolveFixture(fixture);
    this.eventCursor = 0; // Reset cursor when fixture changes
    logger.debug("Fixture changed", { fixture: this.currentFixture.name });
  }

  /**
   * Add a custom fixture
   */
  addFixture(fixture: Fixture): void {
    this.fixtures.set(fixture.name, fixture);
  }

  /**
   * Get the current fixture
   */
  getFixture(): Fixture {
    return this.currentFixture;
  }

  /**
   * Get available fixture names
   */
  getFixtureNames(): string[] {
    return Array.from(this.fixtures.keys());
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Resolve fixture from name or Fixture object
   */
  private resolveFixture(fixture: string | Fixture): Fixture {
    if (typeof fixture === "string") {
      const found = this.fixtures.get(fixture);
      if (!found) {
        logger.warn(`Fixture "${fixture}" not found, using "simple-reply"`);
        return this.fixtures.get("simple-reply")!;
      }
      return found;
    }
    return fixture;
  }

  /**
   * Convert FixtureEvent to DriverStreamEvent
   */
  private convertFixtureEvent(fixtureEvent: FixtureEvent): DriverStreamEvent | null {
    const timestamp = Date.now();
    const data = fixtureEvent.data as Record<string, unknown>;

    switch (fixtureEvent.type) {
      case "message_start":
        return {
          type: "message_start",
          timestamp,
          data: {
            messageId: (data.messageId as string) || `msg_${timestamp}`,
            model: (data.model as string) || "mock-model",
          },
        };

      case "text_delta":
        return {
          type: "text_delta",
          timestamp,
          data: { text: (data.text as string) || "" },
        };

      case "tool_use_start":
        return {
          type: "tool_use_start",
          timestamp,
          data: {
            toolCallId: (data.toolCallId as string) || `tool_${timestamp}`,
            toolName: (data.toolName as string) || "",
          },
        };

      case "input_json_delta":
        return {
          type: "input_json_delta",
          timestamp,
          data: { partialJson: (data.partialJson as string) || "" },
        };

      case "tool_use_stop":
        return {
          type: "tool_use_stop",
          timestamp,
          data: {
            toolCallId: (data.toolCallId as string) || "",
            toolName: (data.toolName as string) || "",
            input: (data.input as Record<string, unknown>) || {},
          },
        };

      case "tool_result":
        return {
          type: "tool_result",
          timestamp,
          data: {
            toolCallId: (data.toolCallId as string) || "",
            result: data.result,
            isError: data.isError as boolean | undefined,
          },
        };

      case "message_delta":
        return {
          type: "message_delta",
          timestamp,
          data: {
            usage: data.usage as { inputTokens: number; outputTokens: number } | undefined,
          },
        };

      case "message_stop":
        return {
          type: "message_stop",
          timestamp,
          data: {
            stopReason:
              (data.stopReason as
                | "end_turn"
                | "tool_use"
                | "max_tokens"
                | "stop_sequence"
                | "other") || "end_turn",
          },
        };

      case "error":
        return {
          type: "error",
          timestamp,
          data: {
            message: (data.message as string) || "Unknown error",
            errorCode: (data.errorCode as string) || "mock_error",
          },
        };

      default:
        // Pass through unknown events with generic structure
        logger.debug(`Unknown fixture event type: ${fixtureEvent.type}`);
        return null;
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a MockDriver factory function
 *
 * Returns a CreateDriver-compatible function.
 *
 * @param mockOptions - Options for all created drivers
 * @returns CreateDriver function
 */
export function createMockDriver(
  mockOptions: MockDriverOptions = {}
): (config: DriverConfig) => Driver {
  return (config: DriverConfig) => new MockDriver(config, mockOptions);
}
