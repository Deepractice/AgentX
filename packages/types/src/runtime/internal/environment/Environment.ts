/**
 * Environment - External world interface (Receptor + Effector)
 *
 * From systems theory:
 * - Environment is everything outside the system boundary
 * - Receptor perceives the environment (input)
 * - Effector acts upon the environment (output)
 *
 * Environment combines both:
 * - Perceives external world (Claude API, Network) → emits to SystemBus
 * - Receives from SystemBus → sends to external world
 *
 * ```
 *                    SystemBus
 *                    ▲       │
 *           emit     │       │ subscribe
 *                    │       ▼
 *              ┌─────┴───────────┐
 *              │   Environment   │
 *              │                 │
 *              │  ┌───────────┐  │
 *              │  │ Receptor  │──┼──► emit to bus
 *              │  └───────────┘  │
 *              │                 │
 *              │  External World │
 *              │  (Claude SDK)   │
 *              │                 │
 *              │  ┌───────────┐  │
 *              │  │ Effector  │◄─┼── subscribe from bus
 *              │  └───────────┘  │
 *              └─────────────────┘
 * ```
 *
 * Implementations:
 * - ClaudeEnvironment: Claude SDK (Node.js)
 * - RemoteEnvironment: Network SSE/WebSocket (Browser)
 *
 * @see issues/030-ecosystem-architecture.md
 */

import type { Receptor } from "./Receptor";
import type { Effector } from "./Effector";

/**
 * Environment - External world interface
 */
export interface Environment {
  /**
   * Environment name
   */
  readonly name: string;

  /**
   * Receptor - perceives external world, emits to SystemBus
   */
  readonly receptor: Receptor;

  /**
   * Effector - subscribes to SystemBus, acts on external world
   */
  readonly effector: Effector;

  /**
   * Warmup the environment (optional pre-initialization)
   *
   * Call this early to reduce latency for the first user message.
   * Implementations should handle this gracefully if not supported.
   */
  warmup?(): Promise<void>;

  /**
   * Dispose environment resources
   */
  dispose(): void;
}
