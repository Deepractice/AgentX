/**
 * LLMProvider - Large Language Model Supply Service
 *
 * Provides LLM invocation capabilities to Drivers.
 * This is a resource component managed by Runtime.
 *
 * ## Architecture Decision Record (ADR)
 *
 * ### Context
 *
 * AgentX separates "business components" from "resource components":
 *
 * - **Business Components**: Agent-specific logic (Driver, Presenter, Middleware)
 * - **Resource Components**: Infrastructure capabilities (LLM, FileSystem, Process)
 *
 * LLM access (apiKey, baseUrl, model) is a resource that:
 * 1. Should not be exposed to Agent business code
 * 2. Can be shared across multiple Agents
 * 3. May have different supply strategies (static, pooled, proxy)
 * 4. Needs unified management (quota, billing, load balancing)
 *
 * ### Decision
 *
 * Create `LLMProvider` as a minimal generic interface:
 *
 * ```typescript
 * interface LLMProvider<TSupply = unknown> {
 *   readonly name: string;
 *   provide(): TSupply;
 * }
 * ```
 *
 * - `name`: Provider identifier (for logging, debugging)
 * - `provide()`: Returns whatever the Driver needs
 * - `TSupply`: User-defined, can be anything (config, client, token, etc.)
 *
 * ### Usage
 *
 * ```typescript
 * // User defines their own supply type
 * interface MyLLMSupply {
 *   apiKey: string;
 *   baseUrl?: string;
 * }
 *
 * // Create provider
 * const provider: LLMProvider<MyLLMSupply> = {
 *   name: "claude",
 *   provide: () => ({
 *     apiKey: process.env.ANTHROPIC_API_KEY!,
 *   }),
 * };
 *
 * // Driver uses it
 * const supply = runtime.llm.provide();
 * ```
 *
 * ### Status
 *
 * **Accepted** - 2024-11-30
 */

/**
 * LLMProvider - Large Language Model supply service
 *
 * @typeParam TSupply - User-defined supply type (config, client, token, etc.)
 */
export interface LLMProvider<TSupply = unknown> {
  /**
   * Provider identifier
   */
  readonly name: string;

  /**
   * Provide LLM access
   */
  provide(): TSupply;
}
