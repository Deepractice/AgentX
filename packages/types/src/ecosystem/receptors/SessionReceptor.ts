import type { Receptor } from "~/ecosystem/Receptor";
import type { SessionCreatedEvent, SessionResumedEvent } from "../event";

/**
 * Session events union type.
 */
export type SessionEvent = SessionCreatedEvent | SessionResumedEvent;

/**
 * SessionReceptor - Emits session lifecycle RuntimeEvents.
 *
 * Responsible for emitting:
 * - session_created: New session created
 * - session_resumed: Existing session resumed
 */
export interface SessionReceptor extends Receptor {}
