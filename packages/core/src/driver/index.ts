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
  CreateDriver,
  // Core Interface
  Driver,
  DriverConfig,
  DriverState,
  DriverStreamEvent,
  DriverStreamEventType,
  ErrorEvent,
  InputJsonDeltaEvent,
  InterruptedEvent,
  // Configuration
  McpServerConfig,
  MessageStartEvent,
  MessageStopEvent,
  StopReason,
  // Stream Events
  StreamEvent,
  TextDeltaEvent,
  ToolDefinition,
  ToolResultEvent,
  ToolUseStartEvent,
  ToolUseStopEvent,
} from "./types";
