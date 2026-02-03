/**
 * MockDriver - Mock Driver for Testing
 *
 * Plays back recorded fixtures when receiving user_message events.
 *
 * Usage:
 * ```typescript
 * const driver = new MockDriver({
 *   agentId: "agent-1",
 *   fixture: "simple-reply",
 * });
 * driver.connect(consumer, producer);
 * ```
 */

import type { Driver, CreateDriverOptions } from "@agentxjs/core/driver";
import type { EventConsumer, EventProducer, BusEvent, DriveableEvent } from "@agentxjs/core/event";
import type { UserMessage } from "@agentxjs/core/agent";
import type { Fixture, FixtureEvent, MockDriverOptions } from "../types";
import { BUILTIN_FIXTURES } from "../../fixtures";
import { createLogger } from "commonxjs/logger";

const logger = createLogger("devtools/MockDriver");

/**
 * Event context for correlation
 */
interface EventContext {
  agentId?: string;
  sessionId?: string;
  containerId?: string;
  imageId?: string;
}

/**
 * MockDriver - Playback driver for testing
 */
export class MockDriver implements Driver {
  readonly name = "MockDriver";

  private agentId: string;
  private readonly options: MockDriverOptions;
  private readonly fixtures: Map<string, Fixture>;
  private currentFixture: Fixture;

  private producer: EventProducer | null = null;
  private unsubscribes: (() => void)[] = [];
  private isPlaying = false;

  /**
   * Create a MockDriver
   *
   * Simple mode:
   *   new MockDriver({ fixture: myFixture })
   *
   * Factory mode:
   *   new MockDriver(driverOptions, mockOptions)
   */
  constructor(
    optionsOrDriverOptions: MockDriverOptions | CreateDriverOptions,
    mockOptions?: MockDriverOptions
  ) {
    // Detect which constructor form is being used
    if (mockOptions !== undefined || "agentId" in optionsOrDriverOptions) {
      // Factory mode: (driverOptions, mockOptions)
      const driverOptions = optionsOrDriverOptions as CreateDriverOptions;
      const opts = mockOptions || {};
      this.agentId = driverOptions.agentId;
      this.options = {
        defaultDelay: 10,
        speedMultiplier: 0,
        ...opts,
      };
      this.fixtures = new Map(BUILTIN_FIXTURES);
      if (opts.fixtures) {
        for (const [name, fixture] of opts.fixtures) {
          this.fixtures.set(name, fixture);
        }
      }
      this.currentFixture = this.resolveFixture(opts.fixture || "simple-reply");
    } else {
      // Simple mode: ({ fixture })
      const opts = optionsOrDriverOptions as MockDriverOptions;
      this.agentId = "mock-agent"; // Will be set on connect based on context
      this.options = {
        defaultDelay: 10,
        speedMultiplier: 0,
        ...opts,
      };
      this.fixtures = new Map(BUILTIN_FIXTURES);
      if (opts.fixtures) {
        for (const [name, fixture] of opts.fixtures) {
          this.fixtures.set(name, fixture);
        }
      }
      this.currentFixture = this.resolveFixture(opts.fixture || "simple-reply");
    }

    logger.debug("MockDriver created", {
      agentId: this.agentId,
      fixture: this.currentFixture.name,
    });
  }

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
   * Set the fixture to use for next playback
   */
  setFixture(fixture: string | Fixture): void {
    this.currentFixture = this.resolveFixture(fixture);
    logger.debug("Fixture changed", { fixture: this.currentFixture.name });
  }

  /**
   * Add a custom fixture
   */
  addFixture(fixture: Fixture): void {
    this.fixtures.set(fixture.name, fixture);
  }

  /**
   * Connect to EventBus
   */
  connect(consumer: EventConsumer, producer: EventProducer): void {
    this.producer = producer;

    logger.debug("MockDriver connected", { agentId: this.agentId });

    // Subscribe to user_message events
    const unsubUserMessage = consumer.on("user_message", async (evt: BusEvent) => {
      const typedEvent = evt as BusEvent & {
        data: UserMessage;
        requestId?: string;
        context?: EventContext;
      };

      // In simple mode (agentId = "mock-agent"), accept any message
      // In factory mode, filter by agentId
      if (this.agentId !== "mock-agent" && typedEvent.context?.agentId !== this.agentId) {
        return;
      }

      // Update agentId from context if in simple mode
      if (this.agentId === "mock-agent" && typedEvent.context?.agentId) {
        this.agentId = typedEvent.context.agentId;
      }

      logger.debug("MockDriver received user_message", {
        agentId: this.agentId,
        fixture: this.currentFixture.name,
      });

      // Play back fixture events
      await this.playFixture(typedEvent.requestId, typedEvent.context);
    });
    this.unsubscribes.push(unsubUserMessage);

    // Subscribe to interrupt events
    const unsubInterrupt = consumer.on("interrupt_request", (evt: BusEvent) => {
      const typedEvent = evt as BusEvent & { context?: EventContext };

      if (typedEvent.context?.agentId !== this.agentId) {
        return;
      }

      logger.debug("MockDriver interrupted", { agentId: this.agentId });
      this.isPlaying = false;
    });
    this.unsubscribes.push(unsubInterrupt);
  }

  /**
   * Disconnect from EventBus
   */
  disconnect(): void {
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
    this.producer = null;
    this.isPlaying = false;
    logger.debug("MockDriver disconnected", { agentId: this.agentId });
  }

  /**
   * Dispose driver resources
   */
  dispose(): void {
    this.disconnect();
    logger.debug("MockDriver disposed", { agentId: this.agentId });
  }

  /**
   * Play back fixture events
   */
  private async playFixture(requestId?: string, context?: EventContext): Promise<void> {
    if (this.isPlaying) {
      logger.warn("Already playing, ignoring new message");
      return;
    }

    this.isPlaying = true;
    const { speedMultiplier = 0, defaultDelay = 10 } = this.options;

    for (const fixtureEvent of this.currentFixture.events) {
      if (!this.isPlaying) {
        // Interrupted
        this.emitInterrupted(requestId, context);
        break;
      }

      // Apply delay
      const delay = fixtureEvent.delay || defaultDelay;
      if (delay > 0 && speedMultiplier > 0) {
        await this.sleep(delay * speedMultiplier);
      }

      // Emit event
      this.emitEvent(fixtureEvent, requestId, context);
    }

    this.isPlaying = false;
  }

  /**
   * Emit a fixture event to EventBus
   */
  private emitEvent(fixtureEvent: FixtureEvent, requestId?: string, context?: EventContext): void {
    if (!this.producer) return;

    const event: DriveableEvent = {
      type: fixtureEvent.type,
      timestamp: Date.now(),
      source: "driver",
      category: "stream",
      intent: "notification",
      requestId,
      context,
      data: fixtureEvent.data,
    } as DriveableEvent;

    // Add index if present
    if (fixtureEvent.index !== undefined) {
      (event as DriveableEvent & { index?: number }).index = fixtureEvent.index;
    }

    this.producer.emit(event);
  }

  /**
   * Emit interrupted event
   */
  private emitInterrupted(requestId?: string, context?: EventContext): void {
    if (!this.producer) return;

    this.producer.emit({
      type: "interrupted",
      timestamp: Date.now(),
      source: "driver",
      category: "stream",
      intent: "notification",
      requestId,
      context,
      data: { reason: "user_interrupt" },
    } as DriveableEvent);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
