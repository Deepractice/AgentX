/**
 * Shared world/context for runtime BDD tests
 */

import { setWorldConstructor, setDefaultTimeout, World, Before, After } from "@cucumber/cucumber";
import { createRuntime } from "@agentxjs/runtime";
import { MockEnvironment } from "../../mocks/MockEnvironment";

// Set default timeout to 10 seconds (MockEnvironment is fast)
setDefaultTimeout(10_000);
import type { Runtime, Agent, ContainerInfo } from "@agentxjs/types/runtime";
import type {
  Persistence,
  ContainerRepository,
  SessionRepository,
  DefinitionRepository,
  ImageRepository,
  ContainerRecord,
  SessionRecord,
} from "@agentxjs/types";
import type { Message } from "@agentxjs/types/agent";

/**
 * In-memory ContainerRepository for testing
 */
class InMemoryContainerRepository implements ContainerRepository {
  private data = new Map<string, ContainerRecord>();

  async saveContainer(record: ContainerRecord): Promise<void> {
    this.data.set(record.containerId, record);
  }

  async findContainerById(containerId: string): Promise<ContainerRecord | null> {
    return this.data.get(containerId) ?? null;
  }

  async findAllContainers(): Promise<ContainerRecord[]> {
    return Array.from(this.data.values());
  }

  async deleteContainer(containerId: string): Promise<void> {
    this.data.delete(containerId);
  }

  async containerExists(containerId: string): Promise<boolean> {
    return this.data.has(containerId);
  }

  clear(): void {
    this.data.clear();
  }
}

/**
 * In-memory SessionRepository for testing
 */
class InMemorySessionRepository implements SessionRepository {
  private data = new Map<string, SessionRecord>();
  private messages = new Map<string, Message[]>();

  async saveSession(record: SessionRecord): Promise<void> {
    this.data.set(record.sessionId, record);
  }

  async findSessionById(sessionId: string): Promise<SessionRecord | null> {
    return this.data.get(sessionId) ?? null;
  }

  async findSessionByAgentId(agentId: string): Promise<SessionRecord | null> {
    for (const record of this.data.values()) {
      if (record.agentId === agentId) {
        return record;
      }
    }
    return null;
  }

  async findSessionsByContainerId(containerId: string): Promise<SessionRecord[]> {
    return Array.from(this.data.values()).filter((r) => r.containerId === containerId);
  }

  async findAllSessions(): Promise<SessionRecord[]> {
    return Array.from(this.data.values());
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.data.delete(sessionId);
    this.messages.delete(sessionId);
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    return this.data.has(sessionId);
  }

  async addMessage(sessionId: string, message: Message): Promise<void> {
    if (!this.messages.has(sessionId)) {
      this.messages.set(sessionId, []);
    }
    this.messages.get(sessionId)!.push(message);
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    return this.messages.get(sessionId) ?? [];
  }

  async clearMessages(sessionId: string): Promise<void> {
    this.messages.delete(sessionId);
  }

  clear(): void {
    this.data.clear();
    this.messages.clear();
  }
}

/**
 * Stub DefinitionRepository for testing (not used in runtime tests)
 */
class StubDefinitionRepository implements DefinitionRepository {
  async saveDefinition(): Promise<void> {}
  async findDefinitionByName(): Promise<null> { return null; }
  async findAllDefinitions(): Promise<[]> { return []; }
  async deleteDefinition(): Promise<void> {}
  async definitionExists(): Promise<boolean> { return false; }
}

/**
 * Stub ImageRepository for testing (not used in runtime tests)
 */
class StubImageRepository implements ImageRepository {
  async saveImage(): Promise<void> {}
  async findImageById(): Promise<null> { return null; }
  async findAllImages(): Promise<[]> { return []; }
  async findImagesByDefinitionName(): Promise<[]> { return []; }
  async deleteImage(): Promise<void> {}
  async imageExists(): Promise<boolean> { return false; }
}

/**
 * In-memory Persistence for testing
 */
class InMemoryPersistence implements Persistence {
  readonly definitions = new StubDefinitionRepository();
  readonly images = new StubImageRepository();
  readonly containers = new InMemoryContainerRepository();
  readonly sessions = new InMemorySessionRepository();

  clear(): void {
    (this.containers as InMemoryContainerRepository).clear();
    (this.sessions as InMemorySessionRepository).clear();
  }
}

/**
 * Mock LLM Provider for testing
 */
function createMockLLMProvider() {
  return {
    name: "mock-claude",
    provide: () => ({
      apiKey: process.env.ANTHROPIC_API_KEY || "test-api-key",
      baseUrl: process.env.ANTHROPIC_BASE_URL,
      model: "claude-sonnet-4-20250514",
    }),
  };
}

/**
 * Custom World class for runtime tests
 */
export class RuntimeWorld extends World {
  // Core components
  runtime!: Runtime;
  persistence!: InMemoryPersistence;

  // Container tracking
  containers = new Map<string, ContainerInfo>();
  currentContainerId: string | null = null;

  // Agent tracking
  agents = new Map<string, Agent>();
  currentAgentId: string | null = null;
  agentsList: Agent[] = [];

  // Event tracking
  receivedEvents: Array<{ type: string; [key: string]: unknown }> = [];

  // Operation results
  operationResult: unknown = null;
  operationError: Error | null = null;

  constructor(options: any) {
    super(options);
  }

  /**
   * Reset all state for a new scenario
   */
  reset(): void {
    this.persistence = new InMemoryPersistence();
    this.containers.clear();
    this.currentContainerId = null;
    this.agents.clear();
    this.currentAgentId = null;
    this.agentsList = [];
    this.receivedEvents = [];
    this.operationResult = null;
    this.operationError = null;
  }

  /**
   * Create runtime with MockEnvironment for testing
   */
  createRuntime(): Runtime {
    this.runtime = createRuntime({
      persistence: this.persistence,
      llmProvider: createMockLLMProvider(),
      environment: new MockEnvironment({
        textResponse: "Hello from MockEnvironment",
      }),
    });
    return this.runtime;
  }
}

// Set the custom world constructor
setWorldConstructor(RuntimeWorld);

// Global Before hook - runs once before each scenario
Before(function (this: RuntimeWorld) {
  this.reset();
  this.createRuntime();
});

// Optional: After hook for cleanup
After(async function (this: RuntimeWorld) {
  if (this.runtime) {
    try {
      await this.runtime.dispose();
    } catch {
      // Ignore errors during cleanup
    }
  }
});
