/**
 * Presentation Class
 *
 * High-level API for UI integration.
 * Wraps AgentX client and provides presentation state management.
 */

import type { AgentX } from "../types";
import type { Unsubscribe, BusEvent } from "@agentxjs/core/event";
import type { PresentationState } from "./types";
import {
  presentationReducer,
  addUserConversation,
  createInitialState,
} from "./reducer";

/**
 * Presentation update handler
 */
export type PresentationUpdateHandler = (state: PresentationState) => void;

/**
 * Presentation error handler
 */
export type PresentationErrorHandler = (error: Error) => void;

/**
 * Presentation options
 */
export interface PresentationOptions {
  /**
   * Called on every state update
   */
  onUpdate?: PresentationUpdateHandler;

  /**
   * Called on errors
   */
  onError?: PresentationErrorHandler;
}

/**
 * Presentation - UI-friendly wrapper for AgentX
 */
export class Presentation {
  private agentx: AgentX;
  private agentId: string;
  private state: PresentationState;
  private updateHandlers: Set<PresentationUpdateHandler> = new Set();
  private errorHandlers: Set<PresentationErrorHandler> = new Set();
  private eventUnsubscribe: Unsubscribe | null = null;

  constructor(agentx: AgentX, agentId: string, options?: PresentationOptions) {
    this.agentx = agentx;
    this.agentId = agentId;
    this.state = createInitialState();

    // Register initial handlers
    if (options?.onUpdate) {
      this.updateHandlers.add(options.onUpdate);
    }
    if (options?.onError) {
      this.errorHandlers.add(options.onError);
    }

    // Subscribe to all events
    this.subscribeToEvents();
  }

  /**
   * Get current state
   */
  getState(): PresentationState {
    return this.state;
  }

  /**
   * Subscribe to state updates
   */
  onUpdate(handler: PresentationUpdateHandler): Unsubscribe {
    this.updateHandlers.add(handler);
    // Immediately call with current state
    handler(this.state);
    return () => {
      this.updateHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to errors
   */
  onError(handler: PresentationErrorHandler): Unsubscribe {
    this.errorHandlers.add(handler);
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  /**
   * Send a message
   */
  async send(content: string): Promise<void> {
    // Add user conversation
    this.state = addUserConversation(this.state, content);
    this.notify();

    try {
      // Send message via agentx
      await this.agentx.sessions.send(this.agentId, content);
    } catch (error) {
      this.notifyError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Interrupt current response
   */
  async interrupt(): Promise<void> {
    try {
      await this.agentx.sessions.interrupt(this.agentId);
    } catch (error) {
      this.notifyError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Reset state
   */
  reset(): void {
    this.state = createInitialState();
    this.notify();
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.eventUnsubscribe) {
      this.eventUnsubscribe();
      this.eventUnsubscribe = null;
    }
    this.updateHandlers.clear();
    this.errorHandlers.clear();
  }

  // ==================== Private ====================

  private subscribeToEvents(): void {
    // Subscribe to all events and filter by agentId
    this.eventUnsubscribe = this.agentx.onAny((event: BusEvent) => {
      // Filter events for this agent (if context is available)
      // Note: Events from server may or may not include context with agentId
      const eventWithContext = event as BusEvent & { context?: { agentId?: string } };
      const eventAgentId = eventWithContext.context?.agentId;

      // Only filter if event has agentId and it doesn't match
      if (eventAgentId && eventAgentId !== this.agentId) {
        return;
      }

      // Reduce event into state
      const newState = presentationReducer(this.state, event);
      if (newState !== this.state) {
        this.state = newState;
        this.notify();
      }
    });
  }

  private notify(): void {
    for (const handler of this.updateHandlers) {
      try {
        handler(this.state);
      } catch (error) {
        console.error("Presentation update handler error:", error);
      }
    }
  }

  private notifyError(error: Error): void {
    for (const handler of this.errorHandlers) {
      try {
        handler(error);
      } catch (e) {
        console.error("Presentation error handler error:", e);
      }
    }
  }
}
