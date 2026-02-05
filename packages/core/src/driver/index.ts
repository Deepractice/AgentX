/**
 * Driver Module
 *
 * Provides interfaces for LLM communication:
 * - Driver: Single session communication with LLM
 * - DriverConfig: Configuration for LLM connection
 * - CreateDriver: Factory function type
 *
 * Key Design:
 * - Clear input/output boundary (for recording/playback)
 * - Single responsibility: only handle session communication
 * - Configuration defined by us (capability boundary)
 *
 * Implementations are provided by platform packages:
 * - @agentxjs/claude-driver: Claude Agent SDK driver
 */

export type {
  // Configuration
  McpServerConfig,
  ToolDefinition,
  DriverConfig,
  DriverState,

  // Core Interface
  Driver,
  CreateDriver,

  // Stream Events
  StreamEvent,
  StopReason,
  MessageStartEvent,
  MessageStopEvent,
  TextDeltaEvent,
  ToolUseStartEvent,
  InputJsonDeltaEvent,
  ToolUseStopEvent,
  ToolResultEvent,
  ErrorEvent,
  InterruptedEvent,
  DriverStreamEvent,
  DriverStreamEventType,
} from "./types";
