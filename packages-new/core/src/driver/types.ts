/**
 * Driver Types - LLM/External World Adapter
 *
 * Driver is the bridge between EventBus and external world (LLM, API, etc.)
 *
 * ```
 *                         EventBus
 *                        ↗        ↘
 *         subscribe     │          │     emit
 *         user_message  │          │     StreamEvent
 *              ↓        │          │      ↑
 *         ┌─────────────────────────────────────┐
 *         │              Driver                  │
 *         │                                      │
 *         │   user_message ───► LLM ───► Stream  │
 *         │                                      │
 *         └─────────────────────────────────────┘
 *                              │
 *                              ▼
 *                       External World
 *                       (Claude SDK)
 * ```
 *
 * Implementations are provided by platform packages:
 * - @agentxjs/claude-driver: Claude Agent SDK driver
 */

import type { EventConsumer, EventProducer } from "../event/types";

// ============================================================================
// MCP Server Configuration
// ============================================================================

/**
 * MCP Server configuration
 *
 * Defines how to launch an MCP server process.
 */
export interface McpServerConfig {
  /**
   * Command to run the MCP server
   */
  command: string;

  /**
   * Command arguments
   */
  args?: string[];

  /**
   * Environment variables for the process
   */
  env?: Record<string, string>;
}

// ============================================================================
// Driver Configuration
// ============================================================================

/**
 * DriverConfig - Configuration for LLM/Agent SDK
 *
 * Contains all settings needed to connect to an LLM provider.
 */
export interface DriverConfig {
  /**
   * API key for authentication
   */
  apiKey: string;

  /**
   * Base URL for API endpoint (optional, for custom deployments)
   */
  baseUrl?: string;

  /**
   * Model identifier (e.g., "claude-sonnet-4-20250514")
   */
  model?: string;

  /**
   * System prompt for the agent
   */
  systemPrompt?: string;

  /**
   * Current working directory for tool execution
   */
  cwd?: string;

  /**
   * Request timeout in milliseconds (default: 600000 = 10 minutes)
   */
  timeout?: number;

  /**
   * MCP servers configuration
   */
  mcpServers?: Record<string, McpServerConfig>;
}

// ============================================================================
// Driver Interface
// ============================================================================

/**
 * Driver interface - LLM/External World Adapter
 *
 * Connects to EventBus and bridges communication with external world:
 * - Subscribes to user_message from EventBus
 * - Sends message to LLM
 * - Receives LLM response
 * - Emits StreamEvent to EventBus
 */
export interface Driver {
  /**
   * Driver name (for identification and logging)
   */
  readonly name: string;

  /**
   * Connect to EventBus
   *
   * After connection:
   * - Subscribes to user_message events
   * - Emits StreamEvent when LLM responds
   *
   * @param consumer - EventBus consumer (for subscribing)
   * @param producer - EventBus producer (for emitting)
   */
  connect(consumer: EventConsumer, producer: EventProducer): void;

  /**
   * Disconnect from EventBus
   *
   * Unsubscribes from all events and cleans up resources.
   */
  disconnect(): void;

  /**
   * Dispose driver resources
   *
   * Called when the driver is no longer needed.
   * Should clean up any external connections (SDK, API clients, etc.)
   */
  dispose(): void;
}

// ============================================================================
// Driver Factory
// ============================================================================

/**
 * CreateDriverOptions - Options for creating a Driver
 */
export interface CreateDriverOptions {
  /**
   * Agent ID (for filtering events)
   */
  agentId: string;

  /**
   * Driver configuration
   */
  config: DriverConfig;

  /**
   * Session ID to resume (optional)
   */
  resumeSessionId?: string;

  /**
   * Callback when SDK session ID is captured
   */
  onSessionIdCaptured?: (sessionId: string) => void;
}

/**
 * DriverFactory - Factory for creating Driver instances
 */
export interface DriverFactory {
  /**
   * Factory name (for identification)
   */
  readonly name: string;

  /**
   * Create a Driver instance
   *
   * @param options - Driver creation options
   * @returns Driver instance
   */
  createDriver(options: CreateDriverOptions): Driver;

  /**
   * Warmup the driver (pre-initialize resources)
   *
   * Call this early to reduce latency for the first message.
   * Safe to call multiple times.
   *
   * @param config - Driver configuration (for pre-validation)
   */
  warmup?(config: DriverConfig): Promise<void>;
}
