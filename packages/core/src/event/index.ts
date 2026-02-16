/**
 * Event Module
 *
 * Central event bus system for ecosystem communication.
 * Provides type-safe pub/sub event handling with RxJS.
 *
 * ## Architecture
 *
 * ```
 * EventBus (interface)
 * ├── EventProducer (write-only view)
 * └── EventConsumer (read-only view)
 *
 * EventBusImpl (implementation)
 * ```
 *
 * ## Usage
 *
 * ```typescript
 * import { EventBusImpl, type EventBus } from "@agentxjs/core/event";
 *
 * const bus: EventBus = new EventBusImpl();
 *
 * // Subscribe to events
 * bus.on("text_delta", (event) => {
 *   console.log(event.data.text);
 * });
 *
 * // Emit events
 * bus.emit({
 *   type: "text_delta",
 *   timestamp: Date.now(),
 *   data: { text: "Hello" },
 * });
 *
 * // Get restricted views for components
 * const producer = bus.asProducer(); // Can only emit
 * const consumer = bus.asConsumer(); // Can only subscribe
 * ```
 */

// Implementation
export { EventBusImpl } from "./EventBus";
// Type definitions from types directory
export * from "./types";
