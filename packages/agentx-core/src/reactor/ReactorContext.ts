/**
 * ReactorContext
 *
 * Context provided to Reactors during initialization.
 */

import type { EventConsumer, EventProducer } from "@deepractice-ai/agentx-event";
import type { AgentLogger } from "~/AgentLogger";

/**
 * Reactor Context
 */
export interface ReactorContext {
  /**
   * Event consumer (subscribe to events)
   */
  readonly consumer: EventConsumer;

  /**
   * Event producer (emit events)
   */
  readonly producer: EventProducer;

  /**
   * Logger (optional)
   */
  readonly logger?: AgentLogger;

  /**
   * Agent ID
   */
  readonly agentId: string;

  /**
   * Session ID
   */
  readonly sessionId: string;
}
