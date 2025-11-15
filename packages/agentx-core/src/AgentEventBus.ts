/**
 * AgentEventBus
 *
 * Core event bus for Agent-Provider communication.
 * Replaces repeated SDK process spawning with a persistent event stream.
 *
 * Architecture:
 * - Outbound: UserMessageEvent (Agent → Provider)
 * - Inbound: AssistantMessageEvent | StreamDeltaEvent | ResultEvent | SystemInitEvent (Provider → Agent)
 *
 * Performance:
 * - First message: ~6-7s (process startup)
 * - Subsequent messages: ~1-2s (3-5x faster)
 */

import { Subject, type Observable } from "rxjs";
import { filter } from "rxjs/operators";
import type { AgentEvent, UserMessageEvent } from "@deepractice-ai/agentx-api";

export class AgentEventBus {
  private events$ = new Subject<AgentEvent>();
  private closed = false;

  /**
   * Emit an event to the bus
   */
  emit(event: AgentEvent): void {
    if (this.closed) {
      throw new Error("AgentEventBus is closed");
    }
    this.events$.next(event);
  }

  /**
   * Subscribe to outbound events (user messages)
   * Provider consumes these to send to AI
   *
   * @returns Observable of UserMessageEvent
   */
  outbound(): Observable<UserMessageEvent> {
    return this.events$.pipe(
      filter((event): event is UserMessageEvent => event.type === "user")
    );
  }

  /**
   * Subscribe to inbound events (AI responses)
   * Agent/UI consume these to display results
   *
   * @returns Observable of all events except UserMessageEvent
   */
  inbound(): Observable<Exclude<AgentEvent, UserMessageEvent>> {
    return this.events$.pipe(
      filter(
        (event): event is Exclude<AgentEvent, UserMessageEvent> => event.type !== "user"
      )
    );
  }

  /**
   * Subscribe to all events (debugging, logging)
   *
   * @returns Observable of all AgentEvent
   */
  all(): Observable<AgentEvent> {
    return this.events$.asObservable();
  }

  /**
   * Close the event bus
   * Completes all subscriptions
   */
  close(): void {
    if (!this.closed) {
      this.closed = true;
      this.events$.complete();
    }
  }

  /**
   * Check if the bus is closed
   */
  isClosed(): boolean {
    return this.closed;
  }
}
