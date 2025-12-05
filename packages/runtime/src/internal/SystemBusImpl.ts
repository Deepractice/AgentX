/**
 * SystemBusImpl - Central event bus implementation
 *
 * Pub/Sub event bus for runtime communication.
 */

import type {
  SystemBus,
  BusEventHandler,
  SubscribeOptions,
  Unsubscribe,
} from "@agentxjs/types/runtime/internal";
import type { SystemEvent } from "@agentxjs/types/runtime";
import { Subject } from "rxjs";

/**
 * Internal subscription record
 */
interface Subscription {
  id: number;
  type: string | string[] | "*";
  handler: BusEventHandler;
  filter?: (event: SystemEvent) => boolean;
  priority: number;
  once: boolean;
}

/**
 * SystemBus implementation using RxJS Subject
 */
export class SystemBusImpl implements SystemBus {
  private readonly subject = new Subject<SystemEvent>();
  private subscriptions: Subscription[] = [];
  private nextId = 0;
  private isDestroyed = false;

  constructor() {
    this.subject.subscribe((event) => {
      this.dispatch(event);
    });
  }

  emit(event: SystemEvent): void {
    if (this.isDestroyed) return;
    this.subject.next(event);
  }

  emitBatch(events: SystemEvent[]): void {
    for (const event of events) {
      this.emit(event);
    }
  }

  on<T extends string>(
    typeOrTypes: T | string[],
    handler: BusEventHandler<SystemEvent & { type: T }>,
    options?: SubscribeOptions<SystemEvent & { type: T }>
  ): Unsubscribe {
    if (this.isDestroyed) return () => {};

    const subscription: Subscription = {
      id: this.nextId++,
      type: typeOrTypes,
      handler: handler as BusEventHandler,
      filter: options?.filter as ((event: SystemEvent) => boolean) | undefined,
      priority: options?.priority ?? 0,
      once: options?.once ?? false,
    };

    this.subscriptions.push(subscription);
    this.sortByPriority();

    return () => this.removeSubscription(subscription.id);
  }

  onAny(handler: BusEventHandler, options?: SubscribeOptions): Unsubscribe {
    if (this.isDestroyed) return () => {};

    const subscription: Subscription = {
      id: this.nextId++,
      type: "*",
      handler,
      filter: options?.filter as ((event: SystemEvent) => boolean) | undefined,
      priority: options?.priority ?? 0,
      once: options?.once ?? false,
    };

    this.subscriptions.push(subscription);
    this.sortByPriority();

    return () => this.removeSubscription(subscription.id);
  }

  once<T extends string>(
    type: T,
    handler: BusEventHandler<SystemEvent & { type: T }>
  ): Unsubscribe {
    return this.on(type, handler, { once: true });
  }

  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.subscriptions = [];
    this.subject.complete();
  }

  private dispatch(event: SystemEvent): void {
    const toRemove: number[] = [];

    for (const sub of this.subscriptions) {
      if (!this.matchesType(sub.type, event.type)) continue;
      if (sub.filter && !sub.filter(event)) continue;

      try {
        sub.handler(event);
      } catch {
        // Ignore handler errors
      }

      if (sub.once) {
        toRemove.push(sub.id);
      }
    }

    for (const id of toRemove) {
      this.removeSubscription(id);
    }
  }

  private matchesType(
    subscriptionType: string | string[] | "*",
    eventType: string
  ): boolean {
    if (subscriptionType === "*") return true;
    if (Array.isArray(subscriptionType)) return subscriptionType.includes(eventType);
    return subscriptionType === eventType;
  }

  private sortByPriority(): void {
    this.subscriptions.sort((a, b) => b.priority - a.priority);
  }

  private removeSubscription(id: number): void {
    this.subscriptions = this.subscriptions.filter((s) => s.id !== id);
  }
}
