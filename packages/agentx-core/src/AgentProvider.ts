/**
 * AgentProvider Interface (SPI - Service Provider Interface)
 *
 * Platform-specific implementation interface for Agent.
 * Different platforms (Node.js, Browser) implement this interface differently.
 *
 * Provider's responsibility: Adapt external SDKs/protocols to our AgentEvent standard.
 *
 * Examples:
 * - ClaudeProvider (Node.js): Adapts @anthropic-ai/claude-agent-sdk → AgentEvent
 * - WebSocketProvider (Browser): Receives AgentEvent from WebSocket server
 * - MockProvider (Testing): Generates mock AgentEvent for testing
 *
 * Key principle: Provider must understand and produce AgentEvent,
 * NOT the other way around. We define the standard, providers adapt to it.
 *
 * Architecture (with AgentEventBus):
 * 1. Provider connects to AgentEventBus via connect()
 * 2. Provider subscribes to eventBus.outbound() for user messages
 * 3. Provider calls external SDK (e.g., Claude SDK in streaming mode)
 * 4. Provider emits responses via eventBus.emit()
 *
 * This enables persistent SDK connections and eliminates repeated process spawning.
 */

import type { AgentEventBus } from "./AgentEventBus";

/**
 * AgentProvider interface
 *
 * Platform-specific implementation must implement this interface.
 * Provider is responsible for transforming external SDK events into AgentEvent.
 */
export interface AgentProvider {
  /**
   * Session ID for this provider instance (Agent's session identifier)
   */
  readonly sessionId: string;

  /**
   * Provider's internal session ID (e.g., SDK's real session ID)
   *
   * This is the actual session identifier used by the underlying SDK/service.
   * Provider must maintain the mapping between sessionId and providerSessionId.
   *
   * @example
   * ```typescript
   * // ClaudeProvider
   * sessionId: "session_123_abc"           // Agent's session ID
   * providerSessionId: "f1fb2903-2a58..."  // Claude SDK's real session ID
   *
   * // Resume uses providerSessionId:
   * query({ resume: this.providerSessionId })
   * ```
   */
  readonly providerSessionId: string | null;

  /**
   * Connect provider to AgentEventBus
   *
   * Provider should:
   * 1. Subscribe to eventBus.outbound() for user messages
   * 2. Start external SDK in streaming/persistent mode (e.g., Claude SDK streaming input)
   * 3. Emit responses via eventBus.emit()
   *
   * This method is called once when Agent is created.
   * The connection persists for the lifetime of the provider.
   *
   * @param eventBus - AgentEventBus instance
   *
   * @example
   * ```typescript
   * // ClaudeProvider implementation
   * async connect(eventBus: AgentEventBus): Promise<void> {
   *   this.eventBus = eventBus;
   *
   *   // Start Claude SDK in streaming input mode (only once!)
   *   this.currentQuery = query({
   *     prompt: this.createMessageStream(eventBus),  // AsyncIterable
   *     options: { model: this.config.model }
   *   });
   *
   *   // Listen to SDK responses and emit to eventBus
   *   this.startListening();
   * }
   *
   * private async *createMessageStream(eventBus: AgentEventBus) {
   *   for await (const userEvent of observableToAsyncIterable(eventBus.outbound())) {
   *     yield { type: 'user', message: userEvent.message.content };
   *   }
   * }
   *
   * private async startListening() {
   *   for await (const sdkMessage of this.currentQuery) {
   *     const agentEvent = this.transformToAgentEvent(sdkMessage);
   *     this.eventBus.emit(agentEvent);  // Emit to bus
   *   }
   * }
   * ```
   */
  connect(eventBus: AgentEventBus): Promise<void>;

  /**
   * Validate configuration
   * Throws if configuration is invalid
   *
   * Each provider defines its own config type and validates accordingly.
   *
   * @param config - Provider-specific configuration to validate
   */
  validateConfig(config: unknown): void;

  /**
   * Abort current operation
   */
  abort(): void;

  /**
   * Destroy provider and clean up resources
   */
  destroy(): Promise<void>;
}
