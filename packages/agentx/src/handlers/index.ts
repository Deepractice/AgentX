/**
 * RPC Handlers — all method handlers registered in one place.
 *
 * To add a new RPC method:
 * 1. Write a handler function in the appropriate file
 * 2. Register it here with registerAll()
 * That's it. No types, mappings, or switch cases to update.
 */

import type { RpcHandlerRegistry } from "../RpcHandlerRegistry";
import { registerImageHandlers } from "./image";
import { registerInstanceHandlers } from "./instance";
import { registerLLMHandlers } from "./llm";
import { registerMessageHandlers } from "./message";
import { registerWorkspaceHandlers } from "./workspace";

/**
 * Register all RPC handlers on the registry
 */
export function registerAll(registry: RpcHandlerRegistry): void {
  registerImageHandlers(registry);
  registerInstanceHandlers(registry);
  registerMessageHandlers(registry);
  registerLLMHandlers(registry);
  registerWorkspaceHandlers(registry);
}
