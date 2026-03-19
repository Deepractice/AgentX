/**
 * Presentation — a live chat session.
 *
 * Read state directly as properties. Subscribe for re-renders.
 * Take actions with send/interrupt/rewind.
 *
 * @example
 * ```typescript
 * // Read state
 * pres.conversations  // message history
 * pres.status         // "idle" | "submitted" | "thinking" | "responding" | "executing"
 * pres.os             // { files, read, write, list } or null
 *
 * // Subscribe (works with useSyncExternalStore)
 * const unsub = pres.subscribe(() => rerender());
 *
 * // Actions
 * await pres.send("Hello");
 * await pres.interrupt();
 * await pres.rewind(2);
 * ```
 */

import type { UserContentPart } from "@agentxjs/core/agent";
import type { SendOptions } from "@agentxjs/core/driver";
import type { BusEvent } from "@agentxjs/core/event";
import type { AgentX } from "../types";
import { addUserConversation, createInitialState, presentationReducer } from "./reducer";
import type {
  ConnectionState,
  Conversation,
  PresentationMetrics,
  PresentationOS,
  PresentationState,
} from "./types";
import { initialPresentationState } from "./types";

// ============================================================================
// Types
// ============================================================================

/**
 * OS view — file tree + operations, unified.
 */
export interface OS {
  /** Current file tree (real-time updates) */
  readonly files: readonly import("./types").FileTreeEntry[];
  /** Read file content */
  read(path: string): Promise<string>;
  /** Write content to file */
  write(path: string, content: string): Promise<void>;
  /** List directory entries */
  list(path?: string): Promise<import("./types").FileTreeEntry[]>;
}

/**
 * Options for creating a Presentation
 */
export interface PresentationOptions {
  /** Called on every state change (legacy — prefer subscribe) */
  onUpdate?: (state: PresentationState) => void;
}

// ============================================================================
// Presentation
// ============================================================================

export class Presentation {
  private _agentx: AgentX;
  private _instanceId: string;
  private _state: PresentationState;
  private _listeners = new Set<() => void>();
  private _legacyHandlers = new Set<(state: PresentationState) => void>();
  private _eventUnsubscribe: (() => void) | null = null;
  private _osOps: PresentationOS | null;

  constructor(
    agentx: AgentX,
    instanceId: string,
    options?: PresentationOptions,
    initialConversations?: Conversation[],
    os?: PresentationOS | null
  ) {
    this._agentx = agentx;
    this._instanceId = instanceId;
    this._osOps = os ?? null;
    this._state = initialConversations?.length
      ? { ...initialPresentationState, conversations: initialConversations }
      : createInitialState();

    // Legacy onUpdate support
    if (options?.onUpdate) {
      this._legacyHandlers.add(options.onUpdate);
    }

    // Subscribe to EventBus
    this._subscribeToEvents();

    // Load initial workspace file tree
    if (this._osOps) {
      this._osOps.list(".").then((files) => {
        this._state = { ...this._state, os: { files } };
        this._notify();
      });
    }
  }

  // ==================== State (direct properties) ====================

  /** All conversations (user, assistant, error) */
  get conversations(): readonly Conversation[] {
    return this._state.conversations;
  }

  /** Current agent status */
  get status(): PresentationState["status"] {
    return this._state.status;
  }

  /** WebSocket connection state */
  get connection(): ConnectionState {
    return this._state.connection;
  }

  /** Token usage and context metrics */
  get metrics(): PresentationMetrics {
    return this._state.metrics;
  }

  /** OS — file tree + operations. null if agent has no OS. */
  get os(): OS | null {
    if (!this._osOps) return null;
    const ops = this._osOps;
    const osState = this._state.os;
    return {
      get files() {
        return osState?.files ?? [];
      },
      read: (path: string) => ops.read(path),
      write: (path: string, content: string) => ops.write(path, content),
      list: (path?: string) => ops.list(path),
    };
  }

  // ==================== Subscribe ====================

  /**
   * Subscribe to state changes.
   * Compatible with React's useSyncExternalStore.
   * Does NOT call listener immediately.
   *
   * @returns Unsubscribe function
   */
  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  /**
   * Get state snapshot.
   * Compatible with React's useSyncExternalStore.
   */
  getSnapshot(): PresentationState {
    return this._state;
  }

  // ==================== Actions ====================

  /** Send a message */
  async send(content: string | UserContentPart[], options?: SendOptions): Promise<void> {
    this._state = addUserConversation(this._state, content);
    this._notify();

    // Yield to allow UI to render submitted state
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      const resolved = this._instanceId.startsWith("inst_")
        ? { instanceId: this._instanceId }
        : { imageId: this._instanceId };
      await this._agentx.rpc("message.send", { ...resolved, content, options });
    } catch (error) {
      console.error("Presentation send error:", error);
    }
  }

  /** Interrupt current response */
  async interrupt(): Promise<void> {
    try {
      const resolved = this._instanceId.startsWith("inst_")
        ? { instanceId: this._instanceId }
        : { imageId: this._instanceId };
      await this._agentx.rpc("instance.interrupt", resolved);
    } catch (error) {
      console.error("Presentation interrupt error:", error);
    }
  }

  /** Rewind conversation to a specific index (removes index and everything after) */
  async rewind(index: number): Promise<void> {
    const conversations = this._state.conversations;
    if (index < 0 || index >= conversations.length) return;

    try {
      let imageId = this._instanceId;
      if (imageId.startsWith("inst_")) {
        const res = await this._agentx.rpc<{ agent: { imageId: string } | null }>("instance.get", {
          instanceId: imageId,
        });
        if (!res.agent) return;
        imageId = res.agent.imageId;
      }
      const msgRes = await this._agentx.rpc<{
        messages: { id: string; subtype?: string }[];
      }>("image.messages", { imageId });
      const messages = msgRes.messages ?? [];
      if (messages.length === 0) return;

      if (index === 0) {
        await this._agentx.rpc("runtime.rewind", {
          imageId: this._instanceId,
          messageId: messages[0].id,
        });
      } else {
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
          await this._agentx.rpc("runtime.rewind", {
            imageId: this._instanceId,
            messageId: messages[msgIndex].id,
          });
        }
      }
    } catch (error) {
      console.error("Presentation rewind error:", error);
    }
  }

  /** Dispose and cleanup all subscriptions */
  dispose(): void {
    if (this._eventUnsubscribe) {
      this._eventUnsubscribe();
      this._eventUnsubscribe = null;
    }
    this._listeners.clear();
    this._legacyHandlers.clear();
  }

  // ==================== Private ====================

  private _subscribeToEvents(): void {
    this._eventUnsubscribe = this._agentx.onAny((event: BusEvent) => {
      const eventWithContext = event as BusEvent & {
        context?: { instanceId?: string; imageId?: string };
      };
      const eventAgentId = eventWithContext.context?.instanceId;

      if (eventAgentId && eventAgentId !== this._instanceId) {
        const eventImageId = eventWithContext.context?.imageId;
        if (!eventImageId || eventImageId !== this._instanceId) {
          return;
        }
      }

      const newState = presentationReducer(this._state, event);
      if (newState !== this._state) {
        this._state = newState;
        this._notify();
      }
    });
  }

  private _notify(): void {
    // New API: bare listeners (for useSyncExternalStore)
    for (const listener of this._listeners) {
      try {
        listener();
      } catch (error) {
        console.error("Presentation listener error:", error);
      }
    }
    // Legacy API: handlers that receive state
    for (const handler of this._legacyHandlers) {
      try {
        handler(this._state);
      } catch (error) {
        console.error("Presentation handler error:", error);
      }
    }
  }
}
