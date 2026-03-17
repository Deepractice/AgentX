/**
 * Platform Types
 *
 * AgentXPlatform - Dependency injection container for platform capabilities.
 * Platform packages (node-platform, etc.) provide implementations.
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                      AgentXPlatform                         │
 * │  (Dependency Injection - Platform provides implementations) │
 * │                                                             │
 * │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
 * │  │ Repositories│ │  EventBus   │ │  Providers  │          │
 * │  │  Container  │ │             │ │  Bash (opt) │          │
 * │  │  Image      │ │             │ │             │          │
 * │  │  Session    │ │             │ │             │          │
 * │  └─────────────┘ └─────────────┘ └─────────────┘          │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 */

import type { ContainerRepository } from "../container/types";
import type { ContextProvider } from "../context/types";
import type { EventBus } from "../event/types";
import type { ImageRepository } from "../image/types";
import type { LLMProviderRepository } from "../llm/types";
import type { ChannelClientFactory } from "../network/RpcClient";
import type { ChannelServer } from "../network/types";
import type { OSProvider } from "../os/types";
import type { PrototypeRepository } from "../persistence/types";
import type { SessionRepository } from "../session/types";

// ============================================================================
// AgentXPlatform - Dependency Injection
// ============================================================================

/**
 * AgentXPlatform - Collects all dependencies for runtime
 *
 * Platform packages provide implementations of these interfaces.
 * The platform is passed to AgentXRuntime for integration.
 *
 * Required capabilities:
 * - containerRepository, imageRepository, sessionRepository — persistence
 * - eventBus — pub/sub
 *
 * Optional capabilities:
 * - bashProvider — command execution (not all platforms support this)
 */
export interface AgentXPlatform {
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
   * Event bus for pub/sub
   */
  readonly eventBus: EventBus;

  /**
   * LLM provider repository for persistence
   *
   * Optional — not all platforms need runtime LLM provider management.
   * When provided, enables ax.llm namespace for CRUD operations.
   */
  readonly llmProviderRepository?: LLMProviderRepository;

  /**
   * Prototype repository for persistence
   *
   * Optional — not all platforms need prototype management.
   * When provided, enables ax.prototype namespace for CRUD operations.
   */
  readonly prototypeRepository?: PrototypeRepository;

  /**
   * Context provider for cognitive context (Layer 2)
   *
   * Optional — when provided, Images with a contextId will have
   * their context automatically created and injected into the Driver.
   * RolexContext is the primary implementation.
   */
  readonly contextProvider?: ContextProvider;

  // === Optional Providers ===

  /**
   * OS provider — unified file system + shell for agents.
   *
   * When provided and Image has an osId, OS tools
   * (read/write/edit/sh/start) are automatically injected into agents.
   * Each Image gets its own isolated OS environment.
   */
  readonly osProvider?: OSProvider;

  /**
   * Channel server for accepting client connections (server-side)
   *
   * Optional — only needed for server scenarios.
   * Node.js platform provides ws-based implementation.
   * Cloudflare platform provides DO Hibernation API implementation.
   */
  readonly channelServer?: ChannelServer;

  /**
   * Channel client factory for creating connections (client-side)
   *
   * Optional — browser uses native WebSocket by default.
   * Node.js platform provides ws-based implementation.
   */
  readonly channelClient?: ChannelClientFactory;
}
