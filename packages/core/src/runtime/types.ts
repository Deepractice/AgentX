/**
 * Runtime Types
 *
 * AgentXProvider - Dependency injection container
 * AgentXRuntime - Runtime integration layer
 *
 * Architecture:
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                      AgentXProvider                         │
 * │  (Dependency Injection - Platform provides implementations) │
 * │                                                             │
 * │  ┌─────────────┐ ┌─────────────┐ ┌───────────────┐         │
 * │  │ Repositories│ │  Workspace  │ │ DriverFactory │         │
 * │  │  Container  │ │  Provider   │ │ (per-Agent)   │         │
 * │  │  Image      │ │             │ │             │           │
 * │  │  Session    │ │             │ │             │           │
 * │  └─────────────┘ └─────────────┘ └─────────────┘           │
 * └─────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │                      AgentXRuntime                          │
 * │           (Integration - Uses Provider dependencies)        │
 * │                                                             │
 * │  ┌─────────────────────────────────────────────────────┐   │
 * │  │  Agent Lifecycle: create / get / destroy            │   │
 * │  │  Message Flow: receive → EventBus → Driver          │   │
 * │  │  Event Subscription: subscribe to agent events      │   │
 * │  └─────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 */

import type { ContainerRepository } from "../container/types";
import type { ImageRepository } from "../image/types";
import type { SessionRepository } from "../session/types";
import type { WorkspaceProvider } from "../workspace/types";
import type { CreateDriver } from "../driver/types";
import type { EventBus } from "../event/types";
import type { UserContentPart } from "../agent/types";
import type { BusEvent } from "../event/types";

// ============================================================================
// Agent Runtime State
// ============================================================================

/**
 * Agent lifecycle states
 */
export type AgentLifecycle = "running" | "stopped" | "destroyed";

/**
 * Runtime Agent - Active agent instance
 */
export interface RuntimeAgent {
  readonly agentId: string;
  readonly imageId: string;
  readonly containerId: string;
  readonly sessionId: string;
  readonly name: string;
  readonly lifecycle: AgentLifecycle;
  readonly createdAt: number;
}

// ============================================================================
// AgentXProvider - Dependency Injection
// ============================================================================

/**
 * AgentXProvider - Collects all dependencies for runtime
 *
 * Platform packages provide implementations of these interfaces.
 * The provider is passed to AgentXRuntime for integration.
 */
export interface AgentXProvider {
  /**
   * Container repository for persistence
   */
  readonly containerRepository: ContainerRepository;

  /**
   * Image repository for persistence
   */
  readonly imageRepository: ImageRepository;

  /**
   * Session repository for persistence
   */
  readonly sessionRepository: SessionRepository;

  /**
   * Workspace provider for isolated environments
   */
  readonly workspaceProvider: WorkspaceProvider;

  /**
   * LLM Driver factory function - creates Driver per Agent
   */
  readonly createDriver: CreateDriver;

  /**
   * Event bus for pub/sub
   */
  readonly eventBus: EventBus;
}

// ============================================================================
// AgentXRuntime - Integration Layer
// ============================================================================

/**
 * Agent creation options
 */
export interface CreateAgentOptions {
  /**
   * Image ID to create agent from
   */
  imageId: string;

  /**
   * Optional agent ID (auto-generated if not provided)
   */
  agentId?: string;
}

/**
 * Event handler for agent events
 */
export type AgentEventHandler = (event: BusEvent) => void;

/**
 * Subscription handle for unsubscribing
 */
export interface Subscription {
  unsubscribe(): void;
}

/**
 * AgentXRuntime - Runtime integration layer
 *
 * Integrates all components to provide agent lifecycle management
 * and message handling.
 */
export interface AgentXRuntime {
  /**
   * The provider containing all dependencies
   */
  readonly provider: AgentXProvider;

  // ==================== Agent Lifecycle ====================

  /**
   * Create and start an agent from an image
   */
  createAgent(options: CreateAgentOptions): Promise<RuntimeAgent>;

  /**
   * Get an active agent by ID
   */
  getAgent(agentId: string): RuntimeAgent | undefined;

  /**
   * Get all active agents
   */
  getAgents(): RuntimeAgent[];

  /**
   * Get agents by container ID
   */
  getAgentsByContainer(containerId: string): RuntimeAgent[];

  /**
   * Stop an agent (can be resumed)
   */
  stopAgent(agentId: string): Promise<void>;

  /**
   * Resume a stopped agent
   */
  resumeAgent(agentId: string): Promise<void>;

  /**
   * Destroy an agent (cannot be resumed)
   */
  destroyAgent(agentId: string): Promise<void>;

  // ==================== Message Handling ====================

  /**
   * Send a message to an agent
   *
   * Emits user_message to EventBus, Driver picks it up and responds.
   */
  receive(agentId: string, content: string | UserContentPart[], requestId?: string): Promise<void>;

  /**
   * Interrupt an agent's current operation
   */
  interrupt(agentId: string, requestId?: string): void;

  // ==================== Event Subscription ====================

  /**
   * Subscribe to events for a specific agent
   */
  subscribe(agentId: string, handler: AgentEventHandler): Subscription;

  /**
   * Subscribe to all events (all agents)
   */
  subscribeAll(handler: AgentEventHandler): Subscription;

  // ==================== Cleanup ====================

  /**
   * Shutdown runtime and cleanup all resources
   */
  shutdown(): Promise<void>;
}

// ============================================================================
// Factory Types
// ============================================================================

/**
 * Configuration for creating AgentXRuntime
 */
export interface AgentXRuntimeConfig {
  provider: AgentXProvider;
}

/**
 * Factory function type for creating AgentXRuntime
 */
export type CreateAgentXRuntime = (config: AgentXRuntimeConfig) => AgentXRuntime;
