/**
 * Session Module
 *
 * Manages conversation messages for an Image.
 *
 * Usage:
 * ```typescript
 * import { createSession, type SessionRepository } from "@agentxjs/core/session";
 *
 * const session = createSession({
 *   sessionId: "session-1",
 *   imageId: "image-1",
 *   containerId: "container-1",
 *   repository: mySessionRepository,
 * });
 *
 * await session.initialize();
 * await session.addMessage(message);
 * const messages = await session.getMessages();
 * ```
 */

export { createSession, SessionImpl } from "./Session";
export type { Session, SessionConfig, SessionRecord, SessionRepository } from "./types";
