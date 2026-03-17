/**
 * RpcHandlerRegistry — single source of truth for RPC method → handler mapping.
 *
 * Register once, use everywhere. No more switch statements or mapping tables.
 *
 * @example
 * ```typescript
 * const registry = new RpcHandlerRegistry();
 * registry.register("workspace.read", async (runtime, params) => {
 *   const content = await workspace.read(params.path);
 *   return ok(content);
 * });
 *
 * const response = await registry.handle(runtime, method, params);
 * ```
 */

import type { AgentXRuntime } from "@agentxjs/core/runtime";
import { createLogger } from "@deepracticex/logger";

const logger = createLogger("agentx/RpcHandlerRegistry");

// ============================================================================
// Types
// ============================================================================

export interface RpcResult<T = unknown> {
  success: true;
  data: T;
}

export interface RpcError {
  success: false;
  code: number;
  message: string;
}

export type RpcResponse<T = unknown> = RpcResult<T> | RpcError;

/** Handler function: receives runtime + params, returns response */
export type RpcHandler = (runtime: AgentXRuntime, params: unknown) => Promise<RpcResponse>;

/** Helper to create success result */
export function ok<T>(data: T): RpcResult<T> {
  return { success: true, data };
}

/** Helper to create error result */
export function err(code: number, message: string): RpcError {
  return { success: false, code, message };
}

// ============================================================================
// Registry
// ============================================================================

export class RpcHandlerRegistry {
  private readonly handlers = new Map<string, RpcHandler>();

  /**
   * Register an RPC method handler
   */
  register(method: string, handler: RpcHandler): this {
    if (this.handlers.has(method)) {
      logger.warn("Overwriting existing handler", { method });
    }
    this.handlers.set(method, handler);
    return this;
  }

  /**
   * Check if a method is registered
   */
  has(method: string): boolean {
    return this.handlers.has(method);
  }

  /**
   * Get all registered method names
   */
  methods(): string[] {
    return [...this.handlers.keys()];
  }

  /**
   * Handle an RPC request — dispatch to registered handler
   */
  async handle(runtime: AgentXRuntime, method: string, params: unknown): Promise<RpcResponse> {
    const handler = this.handlers.get(method);
    if (!handler) {
      return err(-32601, `Method not found: ${method}`);
    }

    try {
      return await handler(runtime, params);
    } catch (error) {
      logger.error("RPC handler error", { method, error });
      return err(-32000, error instanceof Error ? error.message : String(error));
    }
  }
}
