/**
 * Repository - Unified persistence interface for AgentX
 *
 * Single interface for all data operations (containers, images, sessions, messages).
 * Implementations can be local (SQLite) or remote (HTTP API).
 *
 * Part of Docker-style layered architecture:
 * Container → Definition → Image → Session → Agent
 *
 * @example
 * ```typescript
 * // Local implementation (agentx-runtime)
 * const repository = new SQLiteRepository(dbPath);
 *
 * // Remote implementation (agentx browser)
 * const repository = new RemoteRepository({ serverUrl: "http://..." });
 *
 * // Use with runtime
 * const runtime = createRuntime({ repository });
 * ```
 */

import type { ContainerRecord } from "./record/ContainerRecord";
import type { DefinitionRecord } from "./record/DefinitionRecord";
import type { ImageRecord } from "./record/ImageRecord";
import type { SessionRecord } from "./record/SessionRecord";
import type { MessageRecord } from "./record/MessageRecord";

/**
 * Repository - Unified persistence interface
 */
export interface Repository {
  // ==================== Container ====================

  /**
   * Save a container record (create or update)
   */
  saveContainer(record: ContainerRecord): Promise<void>;

  /**
   * Find container by ID
   */
  findContainerById(containerId: string): Promise<ContainerRecord | null>;

  /**
   * Find all containers
   */
  findAllContainers(): Promise<ContainerRecord[]>;

  /**
   * Delete container by ID
   */
  deleteContainer(containerId: string): Promise<void>;

  /**
   * Check if container exists
   */
  containerExists(containerId: string): Promise<boolean>;

  // ==================== Definition ====================

  /**
   * Save a definition record (create or update)
   */
  saveDefinition(record: DefinitionRecord): Promise<void>;

  /**
   * Find definition by name
   */
  findDefinitionByName(name: string): Promise<DefinitionRecord | null>;

  /**
   * Find all definitions
   */
  findAllDefinitions(): Promise<DefinitionRecord[]>;

  /**
   * Delete definition by name
   */
  deleteDefinition(name: string): Promise<void>;

  /**
   * Check if definition exists
   */
  definitionExists(name: string): Promise<boolean>;

  // ==================== Image ====================

  /**
   * Save an image record (create or update)
   */
  saveImage(record: ImageRecord): Promise<void>;

  /**
   * Find image by ID
   */
  findImageById(imageId: string): Promise<ImageRecord | null>;

  /**
   * Find all images
   */
  findAllImages(): Promise<ImageRecord[]>;

  /**
   * Delete image by ID (cascades to sessions)
   */
  deleteImage(imageId: string): Promise<void>;

  /**
   * Check if image exists
   */
  imageExists(imageId: string): Promise<boolean>;

  // ==================== Session ====================

  /**
   * Save a session record (create or update)
   */
  saveSession(record: SessionRecord): Promise<void>;

  /**
   * Find session by ID
   */
  findSessionById(sessionId: string): Promise<SessionRecord | null>;

  /**
   * Find all sessions for an image
   */
  findSessionsByImageId(imageId: string): Promise<SessionRecord[]>;

  /**
   * Find all sessions for a container
   */
  findSessionsByContainerId(containerId: string): Promise<SessionRecord[]>;

  /**
   * Find all sessions
   */
  findAllSessions(): Promise<SessionRecord[]>;

  /**
   * Delete session by ID
   */
  deleteSession(sessionId: string): Promise<void>;

  /**
   * Delete all sessions for an image
   */
  deleteSessionsByImageId(imageId: string): Promise<void>;

  /**
   * Check if session exists
   */
  sessionExists(sessionId: string): Promise<boolean>;

  // ==================== Message ====================
  // Note: Messages are now stored in ImageRecord.messages
  // These methods are kept for backward compatibility during migration

  /**
   * Save a message record
   * @deprecated Messages should be stored in ImageRecord.messages
   */
  saveMessage(record: MessageRecord): Promise<void>;

  /**
   * Find message by ID
   * @deprecated Messages should be stored in ImageRecord.messages
   */
  findMessageById(messageId: string): Promise<MessageRecord | null>;

  /**
   * Find all messages for a session (ordered by createdAt)
   * @deprecated Messages should be stored in ImageRecord.messages
   */
  findMessagesBySessionId(sessionId: string): Promise<MessageRecord[]>;

  /**
   * Delete message by ID
   * @deprecated Messages should be stored in ImageRecord.messages
   */
  deleteMessage(messageId: string): Promise<void>;

  /**
   * Delete all messages for a session
   * @deprecated Messages should be stored in ImageRecord.messages
   */
  deleteMessagesBySessionId(sessionId: string): Promise<void>;

  /**
   * Count messages in a session
   * @deprecated Messages should be stored in ImageRecord.messages
   */
  countMessagesBySessionId(sessionId: string): Promise<number>;
}
