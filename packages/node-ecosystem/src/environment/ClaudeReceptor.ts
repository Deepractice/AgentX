/**
 * ClaudeReceptor - Perceives Claude SDK responses and emits to SystemBus
 *
 * Converts Claude SDK stream events to EnvironmentEvents.
 * Only emits raw streaming materials: text_chunk, stream_start, stream_end, etc.
 */

import type {
  Receptor,
  SystemBus,
  TextChunkEvent,
  StreamStartEvent,
  StreamEndEvent,
  InterruptedEvent,
} from "@agentxjs/types";
import type { SDKPartialAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import { Subject } from "rxjs";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("ecosystem/ClaudeReceptor");

/**
 * ClaudeReceptor - Perceives Claude SDK and emits EnvironmentEvents to SystemBus
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
  emitInterrupted(reason: string): void {
    this.emitToBus({
      type: "interrupted",
      timestamp: Date.now(),
      data: { reason },
    } as InterruptedEvent);
  }

  /**
   * Process stream_event from SDK and emit corresponding EnvironmentEvent
   */
  private processStreamEvent(sdkMsg: SDKPartialAssistantMessage): void {
    const event = sdkMsg.event;

    switch (event.type) {
      case "message_start":
        this.emitToBus({
          type: "stream_start",
          timestamp: Date.now(),
          data: {
            messageId: event.message.id,
            model: event.message.model,
          },
        } as StreamStartEvent);
        break;

      case "content_block_delta":
        if (event.delta.type === "text_delta") {
          this.emitToBus({
            type: "text_chunk",
            timestamp: Date.now(),
            data: { text: event.delta.text },
          } as TextChunkEvent);
        }
        break;

      case "message_stop":
        this.emitToBus({
          type: "stream_end",
          timestamp: Date.now(),
          data: { stopReason: "end_turn" },
        } as StreamEndEvent);
        break;
    }
  }

  private emitToBus(event: TextChunkEvent | StreamStartEvent | StreamEndEvent | InterruptedEvent): void {
    if (this.bus) {
      this.bus.emit(event);
    }
  }
}
