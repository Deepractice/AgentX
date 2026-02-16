/**
 * @agentxjs/server
 *
 * AgentX Server - WebSocket server with Platform support.
 *
 * @example
 * ```typescript
 * import { createServer } from "@agentxjs/server";
 * import { nodePlatform } from "@agentxjs/node-platform";
 * import { createMonoDriver } from "@agentxjs/mono-driver";
 *
 * const server = await createServer({
 *   platform: nodePlatform({ dataPath: "./data" }),
 *   createDriver: createMonoDriver,
 *   port: 5200,
 * });
 *
 * await server.listen();
 * console.log("Server listening on ws://localhost:5200");
 * ```
 */

export { CommandHandler } from "./CommandHandler";
export { createServer, type ServerConfig } from "./Server";
export type { AgentXServer } from "./types";
