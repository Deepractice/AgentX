/**
 * Network Module
 *
 * WebSocket server and connection for Node.js.
 *
 * @example
 * ```typescript
 * import { WebSocketServer } from "@agentxjs/node-platform/network";
 *
 * const server = new WebSocketServer();
 * await server.listen(5200);
 *
 * server.onConnection((connection) => {
 *   console.log("Client connected:", connection.id);
 *
 *   connection.onMessage((message) => {
 *     console.log("Received:", message);
 *   });
 *
 *   // Reliable delivery with ACK
 *   connection.sendReliable(JSON.stringify({ type: "event" }), {
 *     onAck: () => console.log("Client confirmed receipt"),
 *     timeout: 5000,
 *     onTimeout: () => console.log("Client did not ACK"),
 *   });
 * });
 * ```
 */

export { WebSocketConnection } from "./WebSocketConnection";
export { createNodeWebSocket } from "./WebSocketFactory";
export { WebSocketServer } from "./WebSocketServer";
