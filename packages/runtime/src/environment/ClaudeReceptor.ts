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

import type { Receptor, SystemBusProducer } from "@agentxjs/types/runtime/internal";
import type {
  DriveableEvent,
  MessageStartEvent,
  TextDeltaEvent,
  MessageStopEvent,
  InterruptedEvent,
} from "@agentxjs/types/runtime";
import type { SDKPartialAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import { Subject } from "rxjs";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("ecosystem/ClaudeReceptor");

/**
 * ClaudeReceptor - Perceives Claude SDK and emits DriveableEvents to SystemBus
 *
 * Uses SystemBusProducer (write-only) because Receptor only emits events.
 */
export class ClaudeReceptor implements Receptor {
  private producer: SystemBusProducer | null = null;
  readonly responseSubject = new Subject<SDKPartialAssistantMessage>();

  /**
   * Connect to SystemBus producer to emit events
   */
  connect(producer: SystemBusProducer): void {
    this.producer = producer;
    logger.debug("ClaudeReceptor connected to SystemBusProducer");

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
      source: "environment",
      category: "stream",
      intent: "notification",
      broadcastable: false, // Internal event, processed by BusDriver only
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

    // All DriveableEvents are internal-only (broadcastable: false)
    // They are consumed by BusDriver and processed through MealyMachine
    // BusPresenter will emit the transformed SystemEvents to clients

    switch (event.type) {
      case "message_start":
        this.emitToBus({
          type: "message_start",
          timestamp: Date.now(),
          source: "environment",
          category: "stream",
          intent: "notification",
          broadcastable: false,
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
            source: "environment",
            category: "stream",
            intent: "notification",
            broadcastable: false,
            turnId,
            data: { text: event.delta.text },
          } as TextDeltaEvent);
        }
        break;

      case "message_stop":
        this.emitToBus({
          type: "message_stop",
          timestamp: Date.now(),
          source: "environment",
          category: "stream",
          intent: "notification",
          broadcastable: false,
          turnId,
          data: { stopReason: "end_turn" },
        } as MessageStopEvent);
        break;
    }
  }

  private emitToBus(event: DriveableEvent): void {
    if (this.producer) {
      this.producer.emit(event);
    }
  }
}
