/**
 * MockDriver - Test double for AgentDriver
 *
 * Produces configurable StreamEvents for testing Agent behavior.
 */

import type {
  AgentDriver,
  StreamEvent,
  UserMessage,
  MessageStartEvent,
  MessageStopEvent,
  TextDeltaEvent,
} from "@agentxjs/types/agent";

export interface MockDriverOptions {
  name?: string;
  /** Delay before producing events (ms) */
  delay?: number;
  /** Events to produce */
  events?: StreamEvent[];
  /** Text response to produce (convenience) */
  textResponse?: string;
}

export class MockDriver implements AgentDriver {
  readonly name: string;
  readonly description = "Mock driver for testing";

  private _delay: number;
  private _events: StreamEvent[];
  private _interrupted = false;
  private _receivedMessages: UserMessage[] = [];
  private _interruptCalled = false;
  private _interruptCallCount = 0;

  constructor(options: MockDriverOptions = {}) {
    this.name = options.name ?? "MockDriver";
    this._delay = options.delay ?? 0;

    if (options.events) {
      this._events = options.events;
    } else if (options.textResponse) {
      this._events = this.createTextResponseEvents(options.textResponse);
    } else {
      this._events = this.createTextResponseEvents("Hello");
    }
  }

  /**
   * Configure events to produce
   */
  setEvents(events: StreamEvent[]): void {
    this._events = events;
  }

  /**
   * Configure text response (convenience)
   */
  setTextResponse(text: string): void {
    this._events = this.createTextResponseEvents(text);
  }

  /**
   * Configure delay
   */
  setDelay(ms: number): void {
    this._delay = ms;
  }

  /**
   * Get received messages (for assertions)
   */
  get receivedMessages(): UserMessage[] {
    return [...this._receivedMessages];
  }

  /**
   * Check if interrupt was called
   */
  get interruptCalled(): boolean {
    return this._interruptCalled;
  }

  /**
   * Get interrupt call count
   */
  get interruptCallCount(): number {
    return this._interruptCallCount;
  }

  /**
   * Reset state
   */
  reset(): void {
    this._interrupted = false;
    this._interruptCalled = false;
    this._interruptCallCount = 0;
    this._receivedMessages = [];
  }

  async *receive(message: UserMessage): AsyncIterable<StreamEvent> {
    this._receivedMessages.push(message);
    this._interrupted = false;

    for (const event of this._events) {
      if (this._interrupted) {
        return;
      }

      // Apply delay before each event if set
      if (this._delay > 0) {
        await this.sleep(this._delay);
        if (this._interrupted) {
          return;
        }
      }

      yield event;
    }
  }

  interrupt(): void {
    this._interrupted = true;
    this._interruptCalled = true;
    this._interruptCallCount++;
  }

  private createTextResponseEvents(text: string): StreamEvent[] {
    const timestamp = Date.now();
    const messageId = `msg_${timestamp}`;

    const messageStart: MessageStartEvent = {
      type: "message_start",
      timestamp,
      data: {
        messageId,
        model: "mock-model",
      },
    };

    const textDelta: TextDeltaEvent = {
      type: "text_delta",
      timestamp: timestamp + 1,
      data: {
        text,
      },
    };

    const messageStop: MessageStopEvent = {
      type: "message_stop",
      timestamp: timestamp + 2,
      data: {
        stopReason: "end_turn",
      },
    };

    return [messageStart, textDelta, messageStop];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
