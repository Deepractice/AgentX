/**
 * MirrorAgent - Browser-side Agent proxy
 *
 * Proxies Agent operations to server via WebSocket events.
 * Receives events from server and notifies local handlers.
 *
 * Note: This is a simplified proxy that doesn't implement the full Agent interface.
 * It focuses on the essential methods for browser-side usage.
 */

import type {
  AgentState,
  Unsubscribe,
  Peer,
  EnvironmentEvent,
} from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("mirror/MirrorAgent");

// Simplified event handler type
type EventHandler = (event: EnvironmentEvent) => void;

/**
 * MirrorAgent - Browser Agent proxy
 *
 * Implements a subset of Agent interface for browser usage.
 */
export class MirrorAgent {
  readonly agentId: string;

  private readonly peer: Peer;
  private readonly handlers = new Map<string, Set<EventHandler>>();
  private readonly allHandlers = new Set<EventHandler>();
  private _state: AgentState = "idle";
  private _isDestroyed = false;

  constructor(agentId: string, peer: Peer) {
    this.agentId = agentId;
    this.peer = peer;

    logger.debug("MirrorAgent created", { agentId });
  }

  /**
   * Current agent state
   */
  get state(): AgentState {
    return this._state;
  }

  /**
   * Subscribe to all events
   */
  on(handler: EventHandler): Unsubscribe;
  /**
   * Subscribe to specific event type
   */
  on(type: string, handler: EventHandler): Unsubscribe;
  on(typeOrHandler: string | EventHandler, handler?: EventHandler): Unsubscribe {
    if (typeof typeOrHandler === "function") {
      // Subscribe to all events
      this.allHandlers.add(typeOrHandler);
      return () => {
        this.allHandlers.delete(typeOrHandler);
      };
    }

    // Subscribe to specific type
    const type = typeOrHandler;
    const h = handler!;
    let typeHandlers = this.handlers.get(type);
    if (!typeHandlers) {
      typeHandlers = new Set();
      this.handlers.set(type, typeHandlers);
    }
    typeHandlers.add(h);

    return () => {
      typeHandlers?.delete(h);
    };
  }

  /**
   * Send a message to the agent
   */
  async receive(message: string): Promise<void> {
    if (this._isDestroyed) {
      throw new Error("Agent is destroyed");
    }

    logger.debug("Sending message", { agentId: this.agentId });

    // Send user_message event to server
    this.peer.sendUpstream({
      type: "user_message",
      turnId: `turn_${Date.now()}`,
      timestamp: Date.now(),
      data: {
        agentId: this.agentId,
        content: message,
      },
    } as unknown as EnvironmentEvent);
  }

  /**
   * Interrupt current processing
   */
  interrupt(): void {
    this.peer.sendUpstream({
      type: "interrupt_agent",
      turnId: `turn_${Date.now()}`,
      timestamp: Date.now(),
      data: {
        agentId: this.agentId,
      },
    } as unknown as EnvironmentEvent);
  }

  /**
   * Destroy the agent
   */
  async destroy(): Promise<void> {
    this._isDestroyed = true;
    this.handlers.clear();
    this.allHandlers.clear();
    logger.debug("MirrorAgent destroyed", { agentId: this.agentId });
  }

  /**
   * Dispose (alias for destroy)
   */
  dispose(): void {
    this.destroy();
  }

  /**
   * Handle event from server (called by MirrorContainer)
   */
  handleEvent(event: EnvironmentEvent): void {
    const eventType = event.type;

    // Update state based on event
    this.updateState(eventType);

    // Notify type-specific handlers
    const typeHandlers = this.handlers.get(eventType);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try {
          handler(event);
        } catch (err) {
          logger.error("Event handler error", { error: err, eventType });
        }
      }
    }

    // Notify all-event handlers
    for (const handler of this.allHandlers) {
      try {
        handler(event);
      } catch (err) {
        logger.error("All-event handler error", { error: err, eventType });
      }
    }
  }

  /**
   * Update internal state based on event type
   */
  private updateState(eventType: string): void {
    switch (eventType) {
      case "message_start":
        this._state = "thinking";
        break;
      case "text_delta":
        this._state = "responding";
        break;
      case "tool_call":
        this._state = "executing";
        break;
      case "message_stop":
        this._state = "idle";
        break;
    }
  }
}
