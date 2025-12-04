/**
 * SystemBusImpl - Browser-friendly event bus implementation
 *
 * Lightweight implementation without heavy dependencies.
 * Same interface as node-ecosystem's SystemBusImpl.
 */

import type {
  SystemBus,
  BusEvent,
  BusEventHandler,
  SubscribeOptions,
  Unsubscribe,
} from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("ecosystem/SystemBusImpl");

/**
 * Internal subscription record
 */
interface Subscription {
  id: number;
  type: string | string[] | "*";
  handler: BusEventHandler;
  filter?: (event: BusEvent) => boolean;
  priority: number;
  once: boolean;
}

/**
 * Browser-friendly SystemBus implementation
 */
export class SystemBusImpl implements SystemBus {
  private subscriptions: Subscription[] = [];
  private nextId = 0;
  private isDestroyed = false;

  constructor() {
    logger.debug("SystemBus created");
  }

  /**
   * Emit an event to the bus
   */
  emit(event: BusEvent): void {
    if (this.isDestroyed) {
      logger.warn("Attempted to emit on destroyed bus", { type: event.type });
      return;
    }

    logger.debug("Event emitted", { type: event.type });
    this.dispatch(event);
  }

  /**
   * Emit multiple events (batch operation)
   */
  emitBatch(events: BusEvent[]): void {
    for (const event of events) {
      this.emit(event);
    }
  }

  /**
   * Subscribe to event(s)
   */
  on<T extends string>(
    typeOrTypes: T | string[],
    handler: BusEventHandler<BusEvent & { type: T }>,
    options?: SubscribeOptions<BusEvent & { type: T }>
  ): Unsubscribe {
    if (this.isDestroyed) {
      return () => {};
    }

    const subscription: Subscription = {
      id: this.nextId++,
      type: typeOrTypes,
      handler: handler as BusEventHandler,
      filter: options?.filter as ((event: BusEvent) => boolean) | undefined,
      priority: options?.priority ?? 0,
      once: options?.once ?? false,
    };

    this.subscriptions.push(subscription);
    this.sortByPriority();

    return () => this.removeSubscription(subscription.id);
  }

  /**
   * Subscribe to all events
   */
  onAny(handler: BusEventHandler, options?: SubscribeOptions): Unsubscribe {
    if (this.isDestroyed) {
      return () => {};
    }

    const subscription: Subscription = {
      id: this.nextId++,
      type: "*",
      handler,
      filter: options?.filter as ((event: BusEvent) => boolean) | undefined,
      priority: options?.priority ?? 0,
      once: options?.once ?? false,
    };

    this.subscriptions.push(subscription);
    this.sortByPriority();

    return () => this.removeSubscription(subscription.id);
  }

  /**
   * Subscribe once (auto-unsubscribes after first trigger)
   */
  once<T extends string>(
    type: T,
    handler: BusEventHandler<BusEvent & { type: T }>
  ): Unsubscribe {
    return this.on(type, handler, { once: true });
  }

  /**
   * Destroy the bus and clean up resources
   */
  destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;
    this.subscriptions = [];
    logger.debug("SystemBus destroyed");
  }

  /**
   * Dispatch event to matching handlers
   */
  private dispatch(event: BusEvent): void {
    const toRemove: number[] = [];

    for (const sub of this.subscriptions) {
      // Check type match
      if (!this.matchesType(sub.type, event.type)) {
        continue;
      }

      // Check filter
      if (sub.filter && !sub.filter(event)) {
        continue;
      }

      // Execute handler
      try {
        sub.handler(event);
      } catch (error) {
        logger.error("Handler error", { type: event.type, error });
      }

      // Mark for removal if once
      if (sub.once) {
        toRemove.push(sub.id);
      }
    }

    // Remove once subscriptions
    for (const id of toRemove) {
      this.removeSubscription(id);
    }
  }

  /**
   * Check if subscription type matches event type
   */
  private matchesType(
    subscriptionType: string | string[] | "*",
    eventType: string
  ): boolean {
    if (subscriptionType === "*") {
      return true;
    }
    if (Array.isArray(subscriptionType)) {
      return subscriptionType.includes(eventType);
    }
    return subscriptionType === eventType;
  }

  /**
   * Sort subscriptions by priority (higher first)
   */
  private sortByPriority(): void {
    this.subscriptions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove subscription by id
   */
  private removeSubscription(id: number): void {
    this.subscriptions = this.subscriptions.filter((s) => s.id !== id);
  }
}
