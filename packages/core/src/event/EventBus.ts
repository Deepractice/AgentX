/**
 * EventBus - Central event bus implementation
 *
 * Pub/Sub event bus for runtime communication.
 * Uses RxJS Subject for reactive event distribution.
 */

import { createLogger } from "commonxjs/logger";
import { Subject } from "rxjs";
import type {
  BusEvent,
  BusEventHandler,
  CommandEventMap,
  CommandRequestResponseMap,
  CommandRequestType,
  EventBus,
  EventConsumer,
  EventProducer,
  RequestDataFor,
  ResponseEventFor,
  SubscribeOptions,
  Unsubscribe,
} from "./types";

const logger = createLogger("event/EventBus");

/**
 * Generate a unique request ID
 *
 * Uses crypto.randomUUID when available (modern browsers and Node.js 19+),
 * falls back to a timestamp-based ID for older environments.
 */
function generateRequestId(): string {
  // Use crypto.randomUUID if available (browsers and modern Node.js)
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `req_${crypto.randomUUID()}`;
  }
  // Fallback for older environments
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

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
 * EventBusImpl - EventBus implementation using RxJS Subject
 */
export class EventBusImpl implements EventBus {
  private readonly subject = new Subject<BusEvent>();
  private subscriptions: Subscription[] = [];
  private nextId = 0;
  private isDestroyed = false;

  // Cached restricted views
  private producerView: EventProducer | null = null;
  private consumerView: EventConsumer | null = null;

  constructor() {
    this.subject.subscribe((event) => {
      this.dispatch(event);
    });
  }

  emit(event: BusEvent): void {
    if (this.isDestroyed) return;
    this.subject.next(event);
  }

  emitBatch(events: BusEvent[]): void {
    for (const event of events) {
      this.emit(event);
    }
  }

  on<T extends string>(
    typeOrTypes: T | string[],
    handler: BusEventHandler<BusEvent & { type: T }>,
    options?: SubscribeOptions<BusEvent & { type: T }>
  ): Unsubscribe {
    if (this.isDestroyed) return () => {};

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

  onAny(handler: BusEventHandler, options?: SubscribeOptions): Unsubscribe {
    if (this.isDestroyed) return () => {};

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

  once<T extends string>(type: T, handler: BusEventHandler<BusEvent & { type: T }>): Unsubscribe {
    return this.on(type, handler, { once: true });
  }

  onCommand<T extends keyof CommandEventMap>(
    type: T,
    handler: (event: CommandEventMap[T]) => void
  ): Unsubscribe {
    // Reuse the existing on() implementation with type casting
    return this.on(type as string, handler as BusEventHandler);
  }

  emitCommand<T extends keyof CommandEventMap>(type: T, data: CommandEventMap[T]["data"]): void {
    this.emit({
      type,
      timestamp: Date.now(),
      data,
      source: "command",
      category: (type as string).endsWith("_response") ? "response" : "request",
      intent: (type as string).endsWith("_response") ? "result" : "request",
    } as BusEvent);
  }

  request<T extends CommandRequestType>(
    type: T,
    data: RequestDataFor<T>,
    timeout: number = 30000
  ): Promise<ResponseEventFor<T>> {
    return new Promise((resolve, reject) => {
      const requestId = generateRequestId();

      // Get response type from request type
      const responseType = (type as string).replace(
        "_request",
        "_response"
      ) as CommandRequestResponseMap[T];

      // Set up timeout
      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Request timeout: ${type}`));
      }, timeout);

      // Listen for response
      const unsubscribe = this.onCommand(responseType, (event) => {
        // Match by requestId
        if ((event.data as { requestId: string }).requestId === requestId) {
          clearTimeout(timer);
          unsubscribe();
          resolve(event as ResponseEventFor<T>);
        }
      });

      // Emit request with generated requestId
      this.emitCommand(type, { ...data, requestId } as CommandEventMap[T]["data"]);
    });
  }

  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.subscriptions = [];
    this.subject.complete();
  }

  private dispatch(event: BusEvent): void {
    const toRemove: number[] = [];

    for (const sub of this.subscriptions) {
      if (!this.matchesType(sub.type, event.type)) continue;
      if (sub.filter && !sub.filter(event)) continue;

      try {
        sub.handler(event);
      } catch (err) {
        logger.error("Event handler error", {
          eventType: event.type,
          subscriptionType: sub.type,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
      }

      if (sub.once) {
        toRemove.push(sub.id);
      }
    }

    for (const id of toRemove) {
      this.removeSubscription(id);
    }
  }

  private matchesType(subscriptionType: string | string[] | "*", eventType: string): boolean {
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

  /**
   * Get a read-only consumer view (only subscribe methods)
   */
  asConsumer(): EventConsumer {
    if (!this.consumerView) {
      this.consumerView = {
        on: this.on.bind(this),
        onAny: this.onAny.bind(this),
        once: this.once.bind(this),
        onCommand: this.onCommand.bind(this),
        request: this.request.bind(this),
      };
    }
    return this.consumerView;
  }

  /**
   * Get a write-only producer view (only emit methods)
   */
  asProducer(): EventProducer {
    if (!this.producerView) {
      this.producerView = {
        emit: this.emit.bind(this),
        emitBatch: this.emitBatch.bind(this),
        emitCommand: this.emitCommand.bind(this),
      };
    }
    return this.producerView;
  }
}
