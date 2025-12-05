/**
 * RuntimeAPIImpl - Implementation of RuntimeAPI
 *
 * Manages runtime operations: events, containers, sessions, agents.
 *
 * Architecture:
 * ```
 * RuntimeAPIImpl
 *   ├── runtime: Runtime (creates Containers)
 *   ├── persistence: Persistence (stores records)
 *   ├── containers: Map<containerId, Container>
 *   └── sessions: Map<sessionId, SessionImpl>
 * ```
 *
 * Flow:
 * ```
 * run(imageId) {
 *   session = createSession(imageId)  // 1. Session first
 *   agent = container.run(definition) // 2. Then Agent
 *   session.collect(agent)            // 3. Bind collection
 *   return agent
 * }
 * ```
 */

import type {
  RuntimeAPI,
  ContainerInfo,
  Runtime,
  Persistence,
  Container,
  Session,
  Agent,
  AgentDefinition,
  RuntimeEvent,
  Unsubscribe,
  ContainerRecord,
} from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";
import { nanoid } from "nanoid";
import { SessionImpl, createSession } from "./SessionImpl";

const logger = createLogger("agentx/RuntimeAPI");

/**
 * RuntimeAPIImpl - Implementation of RuntimeAPI
 */
export class RuntimeAPIImpl implements RuntimeAPI {
  private readonly runtime: Runtime;
  private readonly persistence: Persistence;
  private readonly containers = new Map<string, Container>();
  private readonly sessions = new Map<string, SessionImpl>();
  private readonly agentToContainer = new Map<string, string>(); // agentId -> containerId
  private readonly agentToSession = new Map<string, string>(); // agentId -> sessionId

  constructor(runtime: Runtime, persistence: Persistence) {
    this.runtime = runtime;
    this.persistence = persistence;
    logger.debug("RuntimeAPIImpl created");
  }

  // ==================== Event Subscription ====================

  on<T extends RuntimeEvent["type"]>(
    type: T,
    handler: (event: Extract<RuntimeEvent, { type: T }>) => void
  ): Unsubscribe {
    logger.debug("Event subscription", { type });
    // Subscribe via runtime, filter by type
    return this.runtime.on((event: any) => {
      if (event && event.type === type) {
        handler(event);
      }
    });
  }

  onAll(handler: (event: RuntimeEvent) => void): Unsubscribe {
    return this.runtime.on(handler as any);
  }

  // ==================== Container Lifecycle ====================

  async createContainer(name?: string): Promise<ContainerInfo> {
    const containerId = `cnt_${nanoid(12)}`;
    const now = Date.now();

    // Create container record
    const record: ContainerRecord = {
      containerId,
      createdAt: now,
      updatedAt: now,
      config: name ? { name } : undefined,
    };

    // Save to persistence
    await this.persistence.containers.saveContainer(record);

    // Create runtime container
    const container = this.runtime.createContainer(containerId);
    this.containers.set(containerId, container);

    logger.info("Container created", { containerId, name });

    return {
      containerId,
      name,
      createdAt: new Date(now),
    };
  }

  async getContainer(containerId: string): Promise<ContainerInfo | undefined> {
    const record = await this.persistence.containers.findContainerById(containerId);
    if (!record) {
      return undefined;
    }

    return {
      containerId: record.containerId,
      name: record.config?.name as string | undefined,
      createdAt: new Date(record.createdAt),
    };
  }

  async listContainers(): Promise<ContainerInfo[]> {
    const records = await this.persistence.containers.findAllContainers();
    return records.map((record) => ({
      containerId: record.containerId,
      name: record.config?.name as string | undefined,
      createdAt: new Date(record.createdAt),
    }));
  }

  async deleteContainer(containerId: string): Promise<boolean> {
    const exists = await this.persistence.containers.containerExists(containerId);
    if (!exists) {
      return false;
    }

    // Dispose runtime container if exists
    const container = this.containers.get(containerId);
    if (container) {
      await container.dispose();
      this.containers.delete(containerId);
    }

    // Delete from persistence
    await this.persistence.containers.deleteContainer(containerId);

    logger.info("Container deleted", { containerId });
    return true;
  }

  // ==================== Session Lifecycle ====================

  async createSession(imageId: string, containerId?: string): Promise<Session> {
    // 1. Get or create container
    let cid = containerId;
    if (!cid) {
      const containerInfo = await this.createContainer();
      cid = containerInfo.containerId;
    }

    // 2. Create session
    const session = await createSession(
      imageId,
      cid,
      this.persistence,
      this.runtime
    );

    // 3. Cache session
    this.sessions.set(session.sessionId, session);

    logger.info("Session created", {
      sessionId: session.sessionId,
      imageId,
      containerId: cid,
    });

    return session;
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    // Check cache first
    const cached = this.sessions.get(sessionId);
    if (cached) {
      return cached;
    }

    // Load from persistence
    const record = await this.persistence.sessions.findSessionById(sessionId);
    if (!record) {
      return undefined;
    }

    // Create SessionImpl and cache
    const session = new SessionImpl({
      record,
      persistence: this.persistence,
      runtime: this.runtime,
    });
    this.sessions.set(sessionId, session);

    return session;
  }

  async listSessions(): Promise<Session[]> {
    const records = await this.persistence.sessions.findAllSessions();
    return records.map((record) => {
      // Use cached or create new
      const cached = this.sessions.get(record.sessionId);
      if (cached) {
        return cached;
      }
      const session = new SessionImpl({
        record,
        persistence: this.persistence,
        runtime: this.runtime,
      });
      this.sessions.set(record.sessionId, session);
      return session;
    });
  }

  async listSessionsByContainer(containerId: string): Promise<Session[]> {
    const records = await this.persistence.sessions.findSessionsByContainerId(containerId);
    return records.map((record) => {
      const cached = this.sessions.get(record.sessionId);
      if (cached) {
        return cached;
      }
      const session = new SessionImpl({
        record,
        persistence: this.persistence,
        runtime: this.runtime,
      });
      this.sessions.set(record.sessionId, session);
      return session;
    });
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const exists = await this.persistence.sessions.sessionExists(sessionId);
    if (!exists) {
      return false;
    }

    // Dispose and remove from cache
    const session = this.sessions.get(sessionId);
    if (session) {
      session.dispose();
      this.sessions.delete(sessionId);
    }

    // Delete from persistence
    await this.persistence.sessions.deleteSession(sessionId);

    logger.info("Session deleted", { sessionId });
    return true;
  }

  // ==================== Agent Lifecycle ====================

  async run(imageId: string, containerId?: string): Promise<Agent> {
    // 1. Get image record
    const imageRecord = await this.persistence.images.findImageById(imageId);
    if (!imageRecord) {
      throw new Error(`Image not found: ${imageId}`);
    }

    // 2. Get or create container
    let cid = containerId;
    if (!cid) {
      const containerInfo = await this.createContainer();
      cid = containerInfo.containerId;
    }

    // 3. Create Session FIRST (ensures recorder is ready before Agent)
    const session = await createSession(
      imageId,
      cid,
      this.persistence,
      this.runtime
    );
    this.sessions.set(session.sessionId, session);

    // 4. Get or create runtime container
    let container = this.containers.get(cid);
    if (!container) {
      container = this.runtime.createContainer(cid);
      this.containers.set(cid, container);
    }

    // 5. Extract definition from image
    const definition = imageRecord.definition as AgentDefinition;

    // 6. Run agent via container
    const agent = await container.run(definition);

    // 7. Bind collection (Session collects Agent events)
    session.collect(agent);

    // 8. Track mappings
    this.agentToContainer.set(agent.agentId, cid);
    this.agentToSession.set(agent.agentId, session.sessionId);

    logger.info("Agent started", {
      agentId: agent.agentId,
      sessionId: session.sessionId,
      containerId: cid,
      imageId,
      definitionName: definition.name,
    });

    return agent;
  }

  getAgent(agentId: string): Agent | undefined {
    const containerId = this.agentToContainer.get(agentId);
    if (!containerId) {
      return undefined;
    }

    const container = this.containers.get(containerId);
    return container?.getAgent(agentId);
  }

  listAgents(): Agent[] {
    const agents: Agent[] = [];
    for (const container of this.containers.values()) {
      agents.push(...container.listAgents());
    }
    return agents;
  }

  async destroyAgent(agentId: string): Promise<void> {
    const containerId = this.agentToContainer.get(agentId);
    if (!containerId) {
      return;
    }

    const container = this.containers.get(containerId);
    if (container) {
      await container.destroyAgent(agentId);
    }

    this.agentToContainer.delete(agentId);
    logger.info("Agent destroyed", { agentId, containerId });
  }

  async destroyAllAgents(): Promise<void> {
    for (const container of this.containers.values()) {
      await container.destroyAllAgents();
    }
    this.agentToContainer.clear();
  }
}
