/**
 * MockEnvironment - Test double for Environment
 *
 * Simulates Claude SDK behavior without calling the real API.
 * Produces configurable DriveableEvents for testing.
 */

import type {
  Environment,
  Receptor,
  Effector,
  SystemBus,
} from "@agentxjs/types/runtime/internal";
import type { UserMessage } from "@agentxjs/types/agent";
import type {
  DriveableEvent,
  MessageStartEvent,
  TextDeltaEvent,
  MessageStopEvent,
} from "@agentxjs/types/runtime";

export interface MockEnvironmentOptions {
  /** Delay before producing events (ms) */
  delay?: number;
  /** Text response to produce */
  textResponse?: string;
  /** Custom events to produce */
  events?: DriveableEvent[];
}

/**
 * MockReceptor - Emits DriveableEvents to SystemBus
 */
class MockReceptor implements Receptor {
  private bus: SystemBus | null = null;

  emit(bus: SystemBus): void {
    this.bus = bus;
  }

  /**
   * Emit an event to the bus
   */
  emitEvent(event: DriveableEvent): void {
    if (this.bus) {
      this.bus.emit(event);
    }
  }
}

/**
 * MockEffector - Listens to user_message and produces mock responses
 */
class MockEffector implements Effector {
  private readonly receptor: MockReceptor;
  private readonly options: MockEnvironmentOptions;

  constructor(receptor: MockReceptor, options: MockEnvironmentOptions) {
    this.receptor = receptor;
    this.options = options;
  }

  subscribe(bus: SystemBus): void {
    bus.on("user_message", async (event) => {
      const message = (event as { type: string; data: UserMessage }).data;
      await this.handleUserMessage(message);
    });
  }

  private async handleUserMessage(_message: UserMessage): Promise<void> {
    // Apply delay if configured
    if (this.options.delay && this.options.delay > 0) {
      await this.sleep(this.options.delay);
    }

    // Produce events
    const events = this.options.events ?? this.createTextResponseEvents(
      this.options.textResponse ?? "Hello from MockEnvironment"
    );

    for (const event of events) {
      this.receptor.emitEvent(event);
    }
  }

  private createTextResponseEvents(text: string): DriveableEvent[] {
    const timestamp = Date.now();
    const turnId = "";

    const messageStart: MessageStartEvent = {
      type: "message_start",
      timestamp,
      turnId,
      data: {
        message: {
          id: `msg_mock_${timestamp}`,
          model: "mock-model",
        },
      },
    };

    const textDelta: TextDeltaEvent = {
      type: "text_delta",
      timestamp: timestamp + 1,
      turnId,
      data: {
        text,
      },
    };

    const messageStop: MessageStopEvent = {
      type: "message_stop",
      timestamp: timestamp + 2,
      turnId,
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

/**
 * MockEnvironment - Test double for ClaudeEnvironment
 */
export class MockEnvironment implements Environment {
  readonly name = "mock";
  readonly receptor: Receptor;
  readonly effector: Effector;

  private readonly mockReceptor: MockReceptor;

  constructor(options: MockEnvironmentOptions = {}) {
    this.mockReceptor = new MockReceptor();
    this.receptor = this.mockReceptor;
    this.effector = new MockEffector(this.mockReceptor, options);
  }

  /**
   * Dispose environment resources
   */
  dispose(): void {
    // Nothing to dispose in mock
  }
}
