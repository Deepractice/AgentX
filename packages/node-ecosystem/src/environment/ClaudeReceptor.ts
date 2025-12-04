/**
 * ClaudeReceptor - Perceives Claude SDK responses and emits to SystemBus
 *
 * Converts Claude SDK stream events to DriveableEvents.
 * DriveableEvents are the subset of EnvironmentEvents that can drive Agent.
 *
 * Type Relationship:
 * ```
 * EnvironmentEvent
 * ├── DriveableEvent ← ClaudeReceptor outputs this
 * │   └── message_start, text_delta, message_stop, interrupted...
 * └── ConnectionEvent
 * ```
 */

import type {
  Receptor,
  SystemBus,
  DriveableEvent,
  MessageStartEvent,
  TextDeltaEvent,
  MessageStopEvent,
  InterruptedEvent,
} from "@agentxjs/types";
import type { SDKPartialAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import { Subject } from "rxjs";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("ecosystem/ClaudeReceptor");

/**
 * ClaudeReceptor - Perceives Claude SDK and emits DriveableEvents to SystemBus
 */
export class ClaudeReceptor implements Receptor {
  private bus: SystemBus | null = null;
  readonly responseSubject = new Subject<SDKPartialAssistantMessage>();

  /**
   * Start emitting events to SystemBus
   */
  emit(bus: SystemBus): void {
    this.bus = bus;
    logger.debug("ClaudeReceptor connected to SystemBus");

    // Subscribe to SDK responses and emit to bus
    this.responseSubject.subscribe({
      next: (sdkMsg) => this.processStreamEvent(sdkMsg),
      error: (err) => logger.error("Response stream error", { error: err }),
      complete: () => logger.debug("Response stream completed"),
    });
  }

  /**
   * Feed SDK message to receptor (called by ClaudeEnvironment)
   */
  feed(sdkMsg: SDKPartialAssistantMessage): void {
    this.responseSubject.next(sdkMsg);
  }

  /**
   * Emit interrupted event
   */
  emitInterrupted(reason: "user_interrupt" | "timeout" | "error" | "system"): void {
    this.emitToBus({
      type: "interrupted",
      timestamp: Date.now(),
      turnId: "", // TODO: Need to track turnId
      data: { reason },
    } as InterruptedEvent);
  }

  /**
   * Process stream_event from SDK and emit corresponding DriveableEvent
   *
   * TODO: turnId should be passed from Effector when the request is made.
   * Currently using placeholder empty string.
   */
  private processStreamEvent(sdkMsg: SDKPartialAssistantMessage): void {
    const event = sdkMsg.event;
    const turnId = ""; // TODO: Implement turnId tracking

    switch (event.type) {
      case "message_start":
        this.emitToBus({
          type: "message_start",
          timestamp: Date.now(),
          turnId,
          data: {
            message: {
              id: event.message.id,
              model: event.message.model,
            },
          },
        } as MessageStartEvent);
        break;

      case "content_block_delta":
        if (event.delta.type === "text_delta") {
          this.emitToBus({
            type: "text_delta",
            timestamp: Date.now(),
            turnId,
            data: { text: event.delta.text },
          } as TextDeltaEvent);
        }
        break;

      case "message_stop":
        this.emitToBus({
          type: "message_stop",
          timestamp: Date.now(),
          turnId,
          data: { stopReason: "end_turn" },
        } as MessageStopEvent);
        break;
    }
  }

  private emitToBus(event: DriveableEvent): void {
    if (this.bus) {
      this.bus.emit(event);
    }
  }
}
