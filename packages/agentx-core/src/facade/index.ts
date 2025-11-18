/**
 * Facade Layer
 *
 * Public API for agentx-core.
 * This layer is used by:
 * - agentx-framework (exposes to external users)
 * - Other agentx-* packages (internal usage)
 *
 * Design principle: Only export contracts (interfaces), utilities, and facade APIs.
 * Internal implementations (AgentEngine, AgentServiceImpl, etc.) are NOT exported.
 */

// ==================== Facade APIs ====================
// Primary APIs for creating agents and drivers
export { createAgent, type AgentInstance, type CreateAgentOptions } from "./createAgent";
export { createDriver, type DriverConfig, type ContentBuilder } from "./createDriver";

// ==================== Interfaces (SPI Contracts) ====================
// Core service and driver interfaces
export type { AgentService } from "~/interfaces/AgentService";
export type { AgentDriver } from "~/interfaces/AgentDriver";
export type { AgentReactor, AgentReactorContext } from "~/interfaces/AgentReactor";

// ==================== Utilities ====================
// Public utilities for building drivers and reactors
export {
  StreamEventBuilder,
  emitError,
  StreamReactorAdapter,
  StateReactorAdapter,
  MessageReactorAdapter,
  ExchangeReactorAdapter,
  wrapUserReactor,
  type UserReactor,
} from "~/utils";
