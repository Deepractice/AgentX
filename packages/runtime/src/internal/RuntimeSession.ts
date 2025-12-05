/**
 * RuntimeSession - Session implementation
 *
 * Collects messages from Agent and persists to storage.
 */

import type { Session, SystemBus } from "@agentxjs/types/runtime/internal";
import type { SessionRepository, SessionRecord } from "@agentxjs/types/persistence";
import type { Message } from "@agentxjs/types/agent";

/**
 * RuntimeSession configuration
 */
export interface RuntimeSessionConfig {
  sessionId: string;
  agentId: string;
  containerId: string;
  repository: SessionRepository;
  bus: SystemBus;
}

/**
 * RuntimeSession - Collects and stores messages
 */
export class RuntimeSession implements Session {
  readonly sessionId: string;
  readonly agentId: string;
  readonly containerId: string;
  readonly createdAt: number;

  private readonly repository: SessionRepository;
  private readonly bus: SystemBus;

  constructor(config: RuntimeSessionConfig) {
    this.sessionId = config.sessionId;
    this.agentId = config.agentId;
    this.containerId = config.containerId;
    this.createdAt = Date.now();
    this.repository = config.repository;
    this.bus = config.bus;
  }

  /**
   * Initialize session in storage
   */
  async initialize(): Promise<void> {
    const record: SessionRecord = {
      sessionId: this.sessionId,
      agentId: this.agentId,
      containerId: this.containerId,
      createdAt: this.createdAt,
      updatedAt: this.createdAt,
    };
    await this.repository.saveSession(record);

    // Emit session_created event
    this.bus.emit({
      type: "session_created",
      timestamp: this.createdAt,
      source: "session",
      category: "lifecycle",
      intent: "notification",
      data: {
        sessionId: this.sessionId,
        imageId: "", // Not applicable for runtime-created sessions
        containerId: this.containerId,
        createdAt: this.createdAt,
      },
      context: {
        containerId: this.containerId,
        agentId: this.agentId,
        sessionId: this.sessionId,
      },
    });
  }

  async addMessage(message: Message): Promise<void> {
    await this.repository.addMessage(this.sessionId, message);

    // Emit message_persisted event
    this.bus.emit({
      type: "message_persisted",
      timestamp: Date.now(),
      source: "session",
      category: "persist",
      intent: "result",
      data: {
        sessionId: this.sessionId,
        messageId: message.id,
        savedAt: Date.now(),
      },
      context: {
        containerId: this.containerId,
        agentId: this.agentId,
        sessionId: this.sessionId,
      },
    });
  }

  async getMessages(): Promise<Message[]> {
    return this.repository.getMessages(this.sessionId);
  }

  async clear(): Promise<void> {
    await this.repository.clearMessages(this.sessionId);
  }
}
