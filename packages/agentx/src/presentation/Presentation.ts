/**
 * Presentation Class
 *
 * High-level API for UI integration.
 * Wraps AgentX client and provides presentation state management.
 */

import type { UserContentPart } from "@agentxjs/core/agent";
import type { BusEvent, Unsubscribe } from "@agentxjs/core/event";
import type { AgentX } from "../types";
import { addUserConversation, createInitialState, presentationReducer } from "./reducer";
import type { Conversation, PresentationState, PresentationWorkspace } from "./types";
import { initialPresentationState } from "./types";

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
  private instanceId: string;
  private state: PresentationState;
  private updateHandlers: Set<PresentationUpdateHandler> = new Set();
  private errorHandlers: Set<PresentationErrorHandler> = new Set();
  private eventUnsubscribe: Unsubscribe | null = null;

  /**
   * Workspace operations — read, write, list files in the agent's workspace.
   * null when the agent has no workspace.
   */
  readonly workspace: PresentationWorkspace | null;

  constructor(
    agentx: AgentX,
    instanceId: string,
    options?: PresentationOptions,
    initialConversations?: Conversation[],
    workspace?: PresentationWorkspace | null
  ) {
    this.agentx = agentx;
    this.instanceId = instanceId;
    this.workspace = workspace ?? null;
    this.state = initialConversations?.length
      ? { ...initialPresentationState, conversations: initialConversations }
      : createInitialState();

    // Register initial handlers
    if (options?.onUpdate) {
      this.updateHandlers.add(options.onUpdate);
    }
    if (options?.onError) {
      this.errorHandlers.add(options.onError);
    }

    // Subscribe to all events
    this.subscribeToEvents();

    // Load initial workspace file tree
    if (this.workspace) {
      this.workspace.list(".").then((files) => {
        this.state = { ...this.state, workspace: { files } };
        this.notify();
      });
    }
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
   * Send a message (text or content parts with files/images)
   */
  async send(content: string | UserContentPart[]): Promise<void> {
    // Set submitted state and notify
    this.state = addUserConversation(this.state, content);
    this.notify();

    // Yield to allow UI frameworks (React, etc.) to render submitted state
    // before stream events arrive and transition to thinking/responding
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      await this.agentx.runtime.session.send(this.instanceId, content);
    } catch (error) {
      this.notifyError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Interrupt current response
   */
  async interrupt(): Promise<void> {
    try {
      await this.agentx.runtime.session.interrupt(this.instanceId);
    } catch (error) {
      this.notifyError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Rewind conversation to a specific index.
   *
   * Calls runtime.rewind — a system-level operation that:
   * 1. Truncates session messages
   * 2. Resets circuit breaker
   * 3. Emits rewind event → reducer updates state
   *
   * @param index - conversation index to rewind to (0-based, removes this index and after)
   */
  async rewind(index: number): Promise<void> {
    const conversations = this.state.conversations;
    if (index < 0 || index >= conversations.length) return;

    try {
      // Map conversation index to message ID
      const messages = await this.agentx.runtime.session.getMessages(this.instanceId);
      if (messages.length === 0) return;

      if (index === 0) {
        // Rewind to beginning — use first message
        await this.agentx.rpc("runtime.rewind", {
          imageId: this.instanceId,
          messageId: messages[0].id,
        });
      } else {
        // Find the message that corresponds to the conversation before rewind point
        let msgIndex = -1;
        let convCount = 0;
        for (let i = 0; i < messages.length; i++) {
          if (messages[i].subtype === "user" || messages[i].subtype === "assistant") {
            convCount++;
          }
          if (convCount >= index) {
            msgIndex = i;
            break;
          }
        }
        if (msgIndex >= 0 && msgIndex < messages.length) {
          await this.agentx.rpc("runtime.rewind", {
            imageId: this.instanceId,
            messageId: messages[msgIndex].id,
          });
        }
      }
    } catch (error) {
      this.notifyError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Edit a user message and resend.
   * Rewinds to the message, replaces it, and sends the new content.
   *
   * @param index - conversation index of the user message to edit (0-based)
   * @param content - new content to send
   */
  async editAndResend(index: number, content: string | UserContentPart[]): Promise<void> {
    // Rewind to before this message
    await this.rewind(index);

    // Send the new content
    await this.send(content);
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
    // Subscribe to all events and filter by instanceId
    this.eventUnsubscribe = this.agentx.onAny((event: BusEvent) => {
      // Filter events for this agent (if context is available)
      // Note: Events from server may or may not include context with instanceId
      const eventWithContext = event as BusEvent & { context?: { instanceId?: string } };
      const eventAgentId = eventWithContext.context?.instanceId;

      // Only filter if event has context and neither instanceId nor imageId matches
      if (eventAgentId && eventAgentId !== this.instanceId) {
        // Also check imageId in context
        const eventImageId = (eventWithContext.context as any)?.imageId;
        if (!eventImageId || eventImageId !== this.instanceId) {
          return;
        }
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
