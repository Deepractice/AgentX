/**
 * Base event types
 */
export type {
  SystemEvent,
  EventSource,
  EventIntent,
  EventCategory,
  EventContext,
} from "./SystemEvent";

export {
  isFromSource,
  hasIntent,
  isRequest,
  isResult,
  isNotification,
} from "./SystemEvent";
