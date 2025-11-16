/**
 * AgentDriver Interface
 *
 * Platform-specific driver that transforms external system data to AgentX Stream events.
 *
 * Key Design Principle: **Driver Only Transforms, Framework Emits**
 *
 * Driver's responsibility:
 * - Transform external data → Stream events (pure transformation)
 * - Framework calls driver.driveXXX() methods
 * - Framework handles event emission to EventBus
 *
 * Layered event generation (automatic):
 * ```
 * Stream Layer (Driver transforms)
 *     ↓ Framework aggregates & emits
 * State Layer (Auto-generated)
 *     ↓ Framework aggregates & emits
 * Message Layer (Auto-generated)
 *     ↓ Framework aggregates & emits
 * Exchange Layer (Auto-generated)
 * ```
 *
 * Example:
 * ```typescript
 * // External system receives data
 * const sdkMessage = { type: "content_block_delta", delta: { text: "Hello" } };
 *
 * // Framework calls driver
 * const event = driver.driveTextDelta(sdkMessage);
 *
 * // Framework emits event to EventBus
 * if (event) {
 *   eventBus.emit(event);
 *   // Framework also auto-generates upper layer events
 * }
 * ```
 */

import type { AgentEventBus } from "./AgentEventBus";
import type {
  // Stream Events
  MessageStartEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  TextDeltaEvent,
  TextContentBlockStopEvent,
  ToolUseContentBlockStartEvent,
  InputJsonDeltaEvent,
  ToolUseContentBlockStopEvent,
  // Outbound Events
  UserMessageEvent,
} from "@deepractice-ai/agentx-event";

/**
 * AgentDriver - Stream Layer Transformation Contract
 *
 * Driver transforms external data to Stream events.
 * Framework handles all event emission and aggregation.
 *
 * Required implementations:
 * - Lifecycle: 4 methods (validateConfig, connect, abort, destroy)
 * - Outbound: 2 methods (handleUserMessage, handleAbort)
 * - Inbound (Stream transforms): 9 drive methods
 *
 * Total: 4 lifecycle + 2 outbound + 9 inbound = 15 methods
 */
export interface AgentDriver {
  // ===== Identity =====

  /**
   * AgentX logical session ID
   */
  readonly sessionId: string;

  /**
   * External system's real session ID (e.g., Claude SDK session ID)
   * null if not yet initialized
   */
  readonly driverSessionId: string | null;

  // ===== Lifecycle =====

  /**
   * Validate driver-specific configuration
   * @throws {AgentConfigError} if config is invalid
   */
  validateConfig(config: unknown): void;

  /**
   * Connect driver to EventBus
   *
   * Driver should:
   * 1. Store reference to eventBus
   * 2. Subscribe to outbound events via eventBus.outbound()
   * 3. Connect to external system (Claude SDK, WebSocket, etc.)
   * 4. When external data arrives, call driveXXX() methods
   * 5. Framework will emit events to EventBus
   *
   * @param eventBus - EventBus instance to connect to
   */
  connect(eventBus: AgentEventBus): Promise<void>;

  /**
   * Abort current operation
   * Should cancel in-flight requests but keep connection alive
   */
  abort(): void;

  /**
   * Destroy driver and release all resources
   * After destroy(), driver cannot be reused
   */
  destroy(): Promise<void>;

  // ===== Outbound: Handle AgentX Events → Send to External System =====

  /**
   * Handle user message from AgentX
   * Driver should convert to external format and send to external system
   *
   * @param event - UserMessageEvent from AgentX
   */
  handleUserMessage(event: UserMessageEvent): void | Promise<void>;

  /**
   * Handle abort command from AgentX
   * Driver should abort external system operation
   */
  handleAbort(): void | Promise<void>;

  // ===== Inbound: Transform External Data → Stream Events =====
  // Note: Driver only transforms. Framework handles emission.
  // All driveXXX methods return events or null.

  /**
   * Drive transformation: External data → MessageStartEvent
   *
   * Called by framework when external system starts a message.
   * Framework will emit the event and trigger ConversationStartStateEvent.
   *
   * @param externalData - External system's raw data
   * @returns MessageStartEvent or null if cannot transform
   */
  driveMessageStart(externalData: unknown): MessageStartEvent | null;

  /**
   * Drive transformation: External data → MessageDeltaEvent
   *
   * @param externalData - External system's raw data
   * @returns MessageDeltaEvent or null if cannot transform
   */
  driveMessageDelta(externalData: unknown): MessageDeltaEvent | null;

  /**
   * Drive transformation: External data → MessageStopEvent
   *
   * Called by framework when external system stops a message.
   * Framework will emit and trigger:
   * - ConversationEndStateEvent (auto)
   * - AssistantMessageEvent (auto, aggregated from deltas)
   * - ExchangeResponseEvent (auto)
   *
   * @param externalData - External system's raw data
   * @returns MessageStopEvent or null if cannot transform
   */
  driveMessageStop(externalData: unknown): MessageStopEvent | null;

  /**
   * Drive transformation: External data → TextContentBlockStartEvent
   *
   * @param externalData - External system's raw data
   * @returns TextContentBlockStartEvent or null if cannot transform
   */
  driveTextContentBlockStart(externalData: unknown): TextContentBlockStartEvent | null;

  /**
   * Drive transformation: External data → TextDeltaEvent
   *
   * Framework aggregates all TextDeltaEvent to build final AssistantMessageEvent.
   *
   * @param externalData - External system's raw data
   * @returns TextDeltaEvent or null if cannot transform
   */
  driveTextDelta(externalData: unknown): TextDeltaEvent | null;

  /**
   * Drive transformation: External data → TextContentBlockStopEvent
   *
   * @param externalData - External system's raw data
   * @returns TextContentBlockStopEvent or null if cannot transform
   */
  driveTextContentBlockStop(externalData: unknown): TextContentBlockStopEvent | null;

  /**
   * Drive transformation: External data → ToolUseContentBlockStartEvent
   *
   * Framework will emit and trigger ToolPlannedStateEvent (auto).
   *
   * @param externalData - External system's raw data
   * @returns ToolUseContentBlockStartEvent or null if cannot transform
   */
  driveToolUseContentBlockStart(externalData: unknown): ToolUseContentBlockStartEvent | null;

  /**
   * Drive transformation: External data → InputJsonDeltaEvent
   *
   * Framework aggregates all InputJsonDeltaEvent to build ToolUseMessageEvent.
   *
   * @param externalData - External system's raw data
   * @returns InputJsonDeltaEvent or null if cannot transform
   */
  driveInputJsonDelta(externalData: unknown): InputJsonDeltaEvent | null;

  /**
   * Drive transformation: External data → ToolUseContentBlockStopEvent
   *
   * Framework will emit and trigger:
   * - ToolCompletedStateEvent (auto)
   * - ToolUseMessageEvent (auto, aggregated from deltas)
   *
   * @param externalData - External system's raw data
   * @returns ToolUseContentBlockStopEvent or null if cannot transform
   */
  driveToolUseContentBlockStop(externalData: unknown): ToolUseContentBlockStopEvent | null;
}

/**
 * PartialAgentDriver - Optional implementation
 *
 * Use this if you only need to implement some Stream transformations.
 * Useful for drivers that don't support all streaming features.
 *
 * Core lifecycle and outbound methods are still REQUIRED.
 */
export type PartialAgentDriver = Partial<
  Omit<
    AgentDriver,
    | "sessionId"
    | "driverSessionId"
    | "validateConfig"
    | "connect"
    | "abort"
    | "destroy"
    | "handleUserMessage"
    | "handleAbort"
  >
> & {
  // Core methods are REQUIRED
  readonly sessionId: string;
  readonly driverSessionId: string | null;
  validateConfig(config: unknown): void;
  connect(eventBus: AgentEventBus): Promise<void>;
  abort(): void;
  destroy(): Promise<void>;
  handleUserMessage(event: UserMessageEvent): void | Promise<void>;
  handleAbort(): void | Promise<void>;
};
