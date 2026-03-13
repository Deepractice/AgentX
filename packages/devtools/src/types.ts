/**
 * DevTools Types
 *
 * Defines the fixture format for recording and playback.
 */

/**
 * A single event in a fixture
 */
export interface FixtureEvent {
  /**
   * Event type (e.g., "message_start", "text_delta", "message_stop")
   */
  type: string;

  /**
   * Delay in milliseconds since last event (0 for first event)
   */
  delay: number;

  /**
   * Event data (type-specific)
   */
  data: unknown;

  /**
   * Optional: index for content blocks
   */
  index?: number;

  /**
   * Optional: event context (instanceId, sessionId, etc.)
   */
  context?: unknown;
}

/**
 * A complete fixture (recorded conversation scenario)
 */
export interface Fixture {
  /**
   * Fixture name (e.g., "simple-reply", "tool-call")
   */
  name: string;

  /**
   * Human-readable description
   */
  description?: string;

  /**
   * When this fixture was recorded (Unix timestamp)
   */
  recordedAt?: number;

  /**
   * The user message that triggers this fixture (optional, for documentation)
   */
  trigger?: string;

  /**
   * Sequence of events to emit
   */
  events: FixtureEvent[];
}

/**
 * Options for MockDriver
 */
export interface MockDriverOptions {
  /**
   * Fixture to use for playback
   */
  fixture?: Fixture | string;

  /**
   * Custom fixtures map (name -> fixture)
   */
  fixtures?: Map<string, Fixture>;

  /**
   * Default delay between events if not specified (ms)
   */
  defaultDelay?: number;

  /**
   * Speed multiplier (1.0 = real time, 0 = instant, 2.0 = half speed)
   */
  speedMultiplier?: number;
}
