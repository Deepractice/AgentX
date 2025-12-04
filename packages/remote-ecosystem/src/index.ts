/**
 * @agentxjs/remote-ecosystem
 *
 * Browser/Remote Ecosystem for AgentX
 *
 * Provides:
 * - RemoteEcosystem: Main assembly for browser environment
 * - WebSocketEnvironment: WebSocket bidirectional communication
 * - SystemBus: Browser-friendly event bus
 *
 * @example
 * ```typescript
 * import { remoteEcosystem } from "@agentxjs/remote-ecosystem";
 *
 * const ecosystem = remoteEcosystem({
 *   url: "wss://api.example.com/ws",
 * });
 *
 * ecosystem.bus.on("text_chunk", (e) => {
 *   console.log(e.data.text);
 * });
 * ```
 */

// Main assembly
export { RemoteEcosystem, remoteEcosystem, type RemoteEcosystemConfig } from "./RemoteEcosystem";

// Environment
export {
  WebSocketEnvironment,
  WebSocketReceptor,
  WebSocketEffector,
  type WebSocketEnvironmentConfig,
  type WebSocketReceptorConfig,
  type WebSocketEffectorConfig,
} from "./environment";

// SystemBus
export { SystemBusImpl } from "./SystemBusImpl";
