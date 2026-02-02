/**
 * Driver Module
 *
 * Provides interfaces for LLM/External World adapters:
 * - Driver: Connects EventBus to external world (LLM)
 * - DriverConfig: Configuration for LLM connection
 * - DriverFactory: Factory for creating Driver instances
 *
 * Implementations are provided by platform packages:
 * - @agentxjs/claude-driver: Claude Agent SDK driver
 */

export type {
  McpServerConfig,
  DriverConfig,
  Driver,
  CreateDriverOptions,
  DriverFactory,
} from "./types";
