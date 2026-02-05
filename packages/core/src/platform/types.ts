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
import type { ImageRepository } from "../image/types";
import type { SessionRepository } from "../session/types";
import type { EventBus } from "../event/types";
import type { BashProvider } from "../bash/types";

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

  // === Optional Providers ===

  /**
   * Bash provider for command execution
   *
   * Optional — not all platforms support shell execution.
   * Node.js platform provides child_process based implementation.
   */
  readonly bashProvider?: BashProvider;
}
