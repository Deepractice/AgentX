/**
 * DriverReactor
 *
 * Internal Reactor that connects AgentDriver to the EventBus.
 *
 * Responsibilities:
 * 1. Subscribe to user_message events from EventBus
 * 2. Call driver.sendMessage() and iterate through Stream events
 * 3. Forward all events to EventBus (no transformation needed)
 *
 * This is an internal implementation detail.
 * Users only interact with AgentDriver interface.
 */

import type { Reactor } from "~/reactor/Reactor";
import type { ReactorContext } from "~/reactor/ReactorContext";
import type { AgentDriver } from "./AgentDriver";
import type { UserMessageEvent } from "@deepractice-ai/agentx-event";

/**
 * DriverReactor
 *
 * Bridges AgentDriver to EventBus using Reactor pattern.
 */
export class DriverReactor implements Reactor {
  readonly id = "driver";
  readonly name = "DriverReactor";

  private context: ReactorContext | null = null;
  private abortController: AbortController | null = null;

  constructor(private driver: AgentDriver) {}

  async initialize(context: ReactorContext): Promise<void> {
    this.context = context;

    context.logger?.debug(`[DriverReactor] Initializing`, {
      driverId: this.id,
      sessionId: context.sessionId,
    });

    // Subscribe to user_message events
    context.consumer.consumeByType("user_message", this.handleUserMessage.bind(this));

    context.logger?.info(`[DriverReactor] Initialized`, {
      driverId: this.id,
      driverSessionId: this.driver.driverSessionId,
    });
  }

  async destroy(): Promise<void> {
    const logger = this.context?.logger;

    logger?.debug(`[DriverReactor] Destroying`, {
      driverId: this.id,
    });

    // Abort any ongoing operations
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.driver.abort();

    // Destroy driver
    await this.driver.destroy();

    this.context = null;

    logger?.info(`[DriverReactor] Destroyed`, {
      driverId: this.id,
    });
  }

  /**
   * Handle user message event
   *
   * Calls driver.sendMessage() and forwards all Stream events to EventBus.
   */
  private async handleUserMessage(event: UserMessageEvent): Promise<void> {
    if (!this.context) {
      console.error("[DriverReactor] No context available");
      return;
    }

    this.context.logger?.debug(`[DriverReactor] Handling user message`, {
      messageId: event.data.id,
    });

    // Create new AbortController for this request
    this.abortController = new AbortController();

    try {
      // Iterate through Stream events from driver
      for await (const streamEvent of this.driver.sendMessage(event.data)) {
        // Check if aborted
        if (this.abortController.signal.aborted) {
          this.context.logger?.debug(`[DriverReactor] Stream aborted`, {
            messageId: event.data.id,
          });
          break;
        }

        // Forward event to EventBus (no transformation needed)
        this.context.producer.produce(streamEvent);

        this.context.logger?.debug(`[DriverReactor] Stream event forwarded`, {
          eventType: streamEvent.type,
          messageId: event.data.id,
        });
      }

      this.context.logger?.info(`[DriverReactor] Message processing complete`, {
        messageId: event.data.id,
      });
    } catch (error) {
      this.context.logger?.error(`[DriverReactor] Error processing stream`, {
        error,
        messageId: event.data.id,
      });

      // TODO: Emit ErrorEvent to EventBus
      // const errorEvent: ErrorEvent = {
      //   type: "error",
      //   ...
      // };
      // this.context.producer.produce(errorEvent);
    } finally {
      this.abortController = null;
    }
  }
}
