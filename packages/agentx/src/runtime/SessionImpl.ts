/**
 * SessionImpl - Implementation of Session interface
 *
 * Session is an external wrapper for conversation management:
 * - Collects Agent events and persists messages
 * - Provides resume/fork capabilities
 * - Manages session metadata (title, timestamps)
 *
 * Architecture:
 * ```
 * run(imageId) {
 *   session = createSession(imageId)  // 1. Session first
 *   agent = container.run(definition) // 2. Then Agent
 *   session.collect(agent)            // 3. Bind collection
 *   return agent
 * }
 * ```
 *
 * Session is transparent to Agent - Agent doesn't know Session exists.
 */

import type {
  Session,
  Agent,
  Message,
  Persistence,
  Runtime,
  SessionRecord,
  ImageRecord,
  AgentDefinition,
  Unsubscribe,
} from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";
import { nanoid } from "nanoid";

const logger = createLogger("agentx/SessionImpl");

/**
 * SessionImpl configuration
 */
export interface SessionImplConfig {
  /**
   * Session record from persistence
   */
  record: SessionRecord;

  /**
   * Persistence layer for storage
   */
  persistence: Persistence;

  /**
   * Runtime for creating agents
   */
  runtime: Runtime;
}

/**
 * SessionImpl - Session implementation
 */
export class SessionImpl implements Session {
  readonly sessionId: string;
  readonly containerId: string;
  readonly imageId: string;
  readonly createdAt: number;

  private _title: string | null;
  private _updatedAt: number;
  private readonly persistence: Persistence;
  private readonly runtime: Runtime;
  private collectUnsubscribes: Unsubscribe[] = [];

  constructor(config: SessionImplConfig) {
    this.sessionId = config.record.sessionId;
    this.containerId = config.record.containerId;
    this.imageId = config.record.imageId;
    this._title = config.record.title ?? null;
    this.createdAt = config.record.createdAt;
    this._updatedAt = config.record.updatedAt;
    this.persistence = config.persistence;
    this.runtime = config.runtime;

    logger.debug("Session created", { sessionId: this.sessionId });
  }

  get title(): string | null {
    return this._title;
  }

  get updatedAt(): number {
    return this._updatedAt;
  }

  /**
   * Resume an agent from this session's image
   */
  async resume(options?: { containerId?: string }): Promise<Agent> {
    // 1. Get image record
    const imageRecord = await this.persistence.images.findImageById(this.imageId);
    if (!imageRecord) {
      throw new Error(`Image not found: ${this.imageId}`);
    }

    // 2. Get or create container
    const containerId = options?.containerId ?? this.containerId;
    const container = this.runtime.createContainer(containerId);

    // 3. Extract definition and run agent
    const definition = imageRecord.definition as AgentDefinition;
    const agent = await container.run(definition);

    // 4. Bind collection (Session collects Agent events)
    this.collect(agent);

    logger.info("Agent resumed from session", {
      sessionId: this.sessionId,
      agentId: agent.agentId,
      imageId: this.imageId,
    });

    return agent;
  }

  /**
   * Fork this session to create a new branch
   */
  async fork(): Promise<Session> {
    // 1. Get current image
    const currentImage = await this.persistence.images.findImageById(this.imageId);
    if (!currentImage) {
      throw new Error(`Image not found: ${this.imageId}`);
    }

    // 2. Get current messages
    const messages = await this.getMessages();

    // 3. Create new derived image
    const newImageId = `img_${nanoid(12)}`;
    const newImage: ImageRecord = {
      imageId: newImageId,
      type: "derived",
      definitionName: currentImage.definitionName,
      parentImageId: this.imageId,
      definition: currentImage.definition,
      config: currentImage.config,
      messages: messages as unknown as Record<string, unknown>[],
      createdAt: Date.now(),
    };
    await this.persistence.images.saveImage(newImage);

    // 4. Create new session pointing to forked image
    const newSessionId = `ses_${nanoid(12)}`;
    const now = Date.now();
    const newRecord: SessionRecord = {
      sessionId: newSessionId,
      containerId: this.containerId,
      imageId: newImageId,
      title: this._title ? `Fork of: ${this._title}` : null,
      createdAt: now,
      updatedAt: now,
    };
    await this.persistence.sessions.saveSession(newRecord);

    logger.info("Session forked", {
      originalSessionId: this.sessionId,
      newSessionId,
      newImageId,
    });

    return new SessionImpl({
      record: newRecord,
      persistence: this.persistence,
      runtime: this.runtime,
    });
  }

  /**
   * Update session title
   */
  async setTitle(title: string): Promise<void> {
    this._title = title;
    this._updatedAt = Date.now();

    // Update in persistence
    const record = await this.persistence.sessions.findSessionById(this.sessionId);
    if (record) {
      await this.persistence.sessions.saveSession({
        ...record,
        title,
        updatedAt: this._updatedAt,
      });
    }

    logger.debug("Session title updated", { sessionId: this.sessionId, title });
  }

  /**
   * Collect messages from an agent
   *
   * Registers event handlers to capture and persist messages.
   */
  collect(agent: Agent): void {
    logger.debug("Starting message collection", {
      sessionId: this.sessionId,
      agentId: agent.agentId,
    });

    // Subscribe to message events
    const unsubscribe = agent.on("assistant_message", async (event) => {
      try {
        await this.persistMessage({
          messageId: `msg_${nanoid(12)}`,
          sessionId: this.sessionId,
          role: "assistant",
          content: event.data.content,
          createdAt: Date.now(),
        });
      } catch (err) {
        logger.error("Failed to persist assistant message", { error: err });
      }
    });

    this.collectUnsubscribes.push(unsubscribe);

    // Also collect user messages if possible
    // Note: User messages are typically captured when agent.receive() is called
    // This might need adjustment based on actual Agent event flow
  }

  /**
   * Get all messages for this session
   */
  async getMessages(): Promise<Message[]> {
    const messageRecords = await this.persistence.sessions.findSessionById(this.sessionId);
    if (!messageRecords) {
      return [];
    }

    // Get image's initial messages
    const imageRecord = await this.persistence.images.findImageById(this.imageId);
    const imageMessages = imageRecord?.messages ?? [];

    // TODO: Also fetch persisted messages from MessageRepository
    // For now, return image messages
    return imageMessages as unknown as Message[];
  }

  /**
   * Persist a message to storage
   */
  private async persistMessage(message: {
    messageId: string;
    sessionId: string;
    role: string;
    content: unknown;
    createdAt: number;
  }): Promise<void> {
    // Update session's updatedAt
    this._updatedAt = Date.now();

    // TODO: Use MessageRepository when available
    // For now, log the message
    logger.debug("Message persisted", {
      sessionId: this.sessionId,
      messageId: message.messageId,
      role: message.role,
    });
  }

  /**
   * Cleanup collection subscriptions
   */
  dispose(): void {
    for (const unsub of this.collectUnsubscribes) {
      unsub();
    }
    this.collectUnsubscribes = [];
    logger.debug("Session disposed", { sessionId: this.sessionId });
  }
}

/**
 * Create a new session
 */
export async function createSession(
  imageId: string,
  containerId: string,
  persistence: Persistence,
  runtime: Runtime
): Promise<SessionImpl> {
  const sessionId = `ses_${nanoid(12)}`;
  const now = Date.now();

  const record: SessionRecord = {
    sessionId,
    containerId,
    imageId,
    title: null,
    createdAt: now,
    updatedAt: now,
  };

  await persistence.sessions.saveSession(record);

  logger.info("Session created", { sessionId, imageId, containerId });

  return new SessionImpl({
    record,
    persistence,
    runtime,
  });
}
