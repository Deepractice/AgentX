/**
 * ApplicationHandler - Framework-agnostic HTTP handler for Application layer
 *
 * Based on Web Standards (Request/Response).
 * Can be adapted to Express, Fastify, Hono, Next.js, etc.
 *
 * Handles static resource CRUD:
 * - Definitions (GET/POST/DELETE /definitions)
 * - Images (GET/POST/DELETE /images)
 * - Platform info (GET /info, /health)
 *
 * @example
 * ```typescript
 * const handler = createApplicationHandler(agentx, {
 *   basePath: "/api",
 *   repository,
 * });
 *
 * // Hono
 * app.all("/api/*", toHonoHandler(handler));
 *
 * // Express
 * app.use("/api", toExpressHandler(handler));
 * ```
 */

import type { Repository } from "~/ecosystem/runtime/repository";
import type { UserMessage } from "~/ecosystem/runtime/agent/message";

/**
 * ApplicationHandler - Framework-agnostic HTTP request handler
 */
export interface ApplicationHandler {
  (request: Request): Promise<Response>;
}

/**
 * ApplicationHandler configuration options
 */
export interface ApplicationHandlerOptions {
  /**
   * Base path prefix (default: "")
   */
  basePath?: string;

  /**
   * Allow dynamic agent creation via API (default: false)
   */
  allowDynamicCreation?: boolean;

  /**
   * Allowed definition names for dynamic creation
   */
  allowedDefinitions?: string[];

  /**
   * Repository for persistence
   *
   * If provided, enables /definitions/*, /images/*, /sessions/* endpoints.
   */
  repository?: Repository;

  /**
   * CORS configuration
   */
  cors?: CorsOptions;

  /**
   * Lifecycle hooks
   */
  hooks?: ApplicationHandlerHooks;
}

/**
 * CORS options
 */
export interface CorsOptions {
  /**
   * Allowed origins
   */
  origin?: string | string[] | boolean;

  /**
   * Allowed methods
   */
  methods?: string[];

  /**
   * Allowed headers
   */
  headers?: string[];

  /**
   * Allow credentials
   */
  credentials?: boolean;
}

/**
 * Lifecycle hooks for ApplicationHandler
 */
export interface ApplicationHandlerHooks {
  /**
   * Called when a client connects (WebSocket/SSE)
   */
  onConnect?: (agentId: string, connectionId: string) => void | Promise<void>;

  /**
   * Called when a client disconnects
   */
  onDisconnect?: (agentId: string, connectionId: string) => void | Promise<void>;

  /**
   * Called before processing a message
   */
  onMessage?: (agentId: string, message: UserMessage) => void | Promise<void>;

  /**
   * Called on errors
   */
  onError?: (agentId: string, error: Error) => void | Promise<void>;
}
