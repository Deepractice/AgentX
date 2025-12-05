/**
 * BusDriver - AgentDriver that communicates via SystemBus
 *
 * Flow:
 * ```
 * Agent.receive(message)
 *   → BusDriver.receive(message)
 *     → bus.emit({ type: "user_message", data: message })
 *       → Effector → Claude SDK → Receptor
 *         → bus.emit(DriveableEvent)
 *           → BusDriver yields to Agent
 * ```
 */

import type { AgentDriver, UserMessage } from "@agentxjs/types/agent";
import type { SystemBus } from "@agentxjs/types/runtime/internal";
import type { DriveableEvent } from "@agentxjs/types/runtime";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("runtime/BusDriver");

/** Default timeout in milliseconds (30 seconds) */
const DEFAULT_TIMEOUT = 30_000;

/**
 * BusDriver configuration
 */
export interface BusDriverConfig {
  agentId: string;
  generateTurnId?: () => string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * BusDriver - Communicates with Environment via SystemBus
 */
export class BusDriver implements AgentDriver {
  readonly name = "BusDriver";
  readonly description = "Driver that communicates via SystemBus";

  private readonly bus: SystemBus;
  private readonly config: BusDriverConfig;
  private currentTurnId: string | null = null;
  private aborted = false;

  constructor(bus: SystemBus, config: BusDriverConfig) {
    this.bus = bus;
    this.config = config;
  }

  async *receive(message: UserMessage): AsyncIterable<DriveableEvent> {
    this.aborted = false;
    this.currentTurnId = this.config.generateTurnId?.() ?? this.generateTurnId();

    const events: DriveableEvent[] = [];
    let resolveNext: ((value: IteratorResult<DriveableEvent>) => void) | null = null;
    let done = false;
    let timedOut = false;

    const timeout = this.config.timeout ?? DEFAULT_TIMEOUT;
    const timeoutId = setTimeout(() => {
      logger.warn("Request timeout", { timeout, agentId: this.config.agentId });
      timedOut = true;
      done = true;
      if (resolveNext) {
        resolveNext({ done: true, value: undefined as never });
      }
    }, timeout);

    const unsubscribe = this.bus.onAny((event) => {
      if (!this.isDriveableEvent(event)) return;

      // Clear timeout on first event received
      clearTimeout(timeoutId);

      if (this.aborted) {
        done = true;
        if (resolveNext) {
          resolveNext({ done: true, value: undefined as never });
        }
        return;
      }

      if (event.type === "message_stop" || event.type === "interrupted") {
        events.push(event);
        done = true;
      } else {
        events.push(event);
      }

      if (resolveNext) {
        const e = events.shift();
        if (e) {
          resolveNext({ done: false, value: e });
          resolveNext = null;
        } else if (done) {
          resolveNext({ done: true, value: undefined as never });
          resolveNext = null;
        }
      }
    });

    try {
      // Emit user message to bus
      this.bus.emit({
        type: "user_message",
        data: message,
      } as never);

      while (!done || events.length > 0) {
        if (events.length > 0) {
          const event = events.shift()!;
          yield event;
          if (event.type === "message_stop" || event.type === "interrupted") {
            break;
          }
        } else if (!done) {
          await new Promise<IteratorResult<DriveableEvent>>((resolve) => {
            resolveNext = resolve;
          });
        }
      }

      if (timedOut) {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
    } finally {
      clearTimeout(timeoutId);
      unsubscribe();
      this.currentTurnId = null;
    }
  }

  interrupt(): void {
    this.aborted = true;
    this.bus.emit({
      type: "interrupt",
      agentId: this.config.agentId,
    } as never);
  }

  private generateTurnId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `turn_${timestamp}_${random}`;
  }

  private isDriveableEvent(event: unknown): event is DriveableEvent {
    const driveableTypes = [
      "message_start",
      "message_delta",
      "message_stop",
      "text_content_block_start",
      "text_delta",
      "text_content_block_stop",
      "tool_use_content_block_start",
      "input_json_delta",
      "tool_use_content_block_stop",
      "tool_call",
      "tool_result",
      "interrupted",
    ];
    return (
      event !== null &&
      typeof event === "object" &&
      "type" in event &&
      typeof (event as { type: unknown }).type === "string" &&
      driveableTypes.includes((event as { type: string }).type)
    );
  }
}
