import { describe, test, expect, mock } from "bun:test";
import { WebSocketServer } from "../../../src/server/WebSocketServer";
import { WebSocket } from "ws";

// Get a random available port
function getRandomPort(): number {
  return 20000 + Math.floor(Math.random() * 10000);
}

// Increase timeout for integration tests
const TEST_TIMEOUT = 10000;

describe("WebSocketServer", () => {
  describe("listen", () => {
    test(
      "starts listening on specified port",
      async () => {
        const port = getRandomPort();
        const server = new WebSocketServer({ heartbeat: false });

        await server.listen(port);

        // Try to connect
        const client = new WebSocket(`ws://localhost:${port}`);
        await new Promise<void>((resolve, reject) => {
          client.on("open", resolve);
          client.on("error", reject);
        });

        client.close();
        await server.close();
      },
      TEST_TIMEOUT
    );

    test(
      "throws if already listening",
      async () => {
        const port = getRandomPort();
        const server = new WebSocketServer({ heartbeat: false });

        await server.listen(port);
        await expect(server.listen(port + 1)).rejects.toThrow("already listening");
        await server.close();
      },
      TEST_TIMEOUT
    );
  });

  describe("onConnection", () => {
    test(
      "notifies handler when client connects",
      async () => {
        const port = getRandomPort();
        const server = new WebSocketServer({ heartbeat: false });
        await server.listen(port);

        const onConnection = mock(() => {});
        server.onConnection(onConnection);

        const client = new WebSocket(`ws://localhost:${port}`);
        await new Promise<void>((resolve) => client.on("open", resolve));

        // Small delay for connection handler
        await new Promise((r) => setTimeout(r, 50));

        expect(onConnection).toHaveBeenCalledTimes(1);
        const connection = onConnection.mock.calls[0][0];
        expect(connection.id).toMatch(/^conn_/);

        client.close();
        await server.close();
      },
      TEST_TIMEOUT
    );
  });

  describe("broadcast", () => {
    test(
      "sends message to all connected clients",
      async () => {
        const port = getRandomPort();
        const server = new WebSocketServer({ heartbeat: false });
        await server.listen(port);

        const client1 = new WebSocket(`ws://localhost:${port}`);
        const client2 = new WebSocket(`ws://localhost:${port}`);

        await Promise.all([
          new Promise<void>((resolve) => client1.on("open", resolve)),
          new Promise<void>((resolve) => client2.on("open", resolve)),
        ]);

        const messages1: string[] = [];
        const messages2: string[] = [];

        client1.on("message", (data) => messages1.push(data.toString()));
        client2.on("message", (data) => messages2.push(data.toString()));

        await new Promise((r) => setTimeout(r, 50));

        server.broadcast("hello all");

        await new Promise((r) => setTimeout(r, 50));

        expect(messages1).toContain("hello all");
        expect(messages2).toContain("hello all");

        client1.close();
        client2.close();
        await server.close();
      },
      TEST_TIMEOUT
    );
  });

  describe("connection communication", () => {
    test(
      "connection can send messages to client",
      async () => {
        const port = getRandomPort();
        const server = new WebSocketServer({ heartbeat: false });
        await server.listen(port);

        let serverConnection: any;
        server.onConnection((conn) => {
          serverConnection = conn;
        });

        const client = new WebSocket(`ws://localhost:${port}`);
        const received: string[] = [];

        await new Promise<void>((resolve) => client.on("open", resolve));
        client.on("message", (data) => received.push(data.toString()));

        await new Promise((r) => setTimeout(r, 50));

        serverConnection.send("server message");

        await new Promise((r) => setTimeout(r, 50));

        expect(received).toContain("server message");

        client.close();
        await server.close();
      },
      TEST_TIMEOUT
    );

    test(
      "connection receives messages from client",
      async () => {
        const port = getRandomPort();
        const server = new WebSocketServer({ heartbeat: false });
        await server.listen(port);

        const serverReceived: string[] = [];
        server.onConnection((conn) => {
          conn.onMessage((msg) => serverReceived.push(msg));
        });

        const client = new WebSocket(`ws://localhost:${port}`);
        await new Promise<void>((resolve) => client.on("open", resolve));

        await new Promise((r) => setTimeout(r, 50));

        client.send("client message");

        await new Promise((r) => setTimeout(r, 50));

        expect(serverReceived).toContain("client message");

        client.close();
        await server.close();
      },
      TEST_TIMEOUT
    );
  });

  describe("sendReliable integration", () => {
    test(
      "client auto-sends ACK for reliable messages",
      async () => {
        const port = getRandomPort();
        const server = new WebSocketServer({ heartbeat: false });
        await server.listen(port);

        let serverConnection: any;
        server.onConnection((conn) => {
          serverConnection = conn;
        });

        const client = new WebSocket(`ws://localhost:${port}`);
        const clientReceived: string[] = [];

        await new Promise<void>((resolve) => client.on("open", resolve));

        // Client auto-ACK implementation
        client.on("message", (data) => {
          const msg = data.toString();
          try {
            const parsed = JSON.parse(msg);
            if (parsed.__msgId && parsed.__payload) {
              client.send(JSON.stringify({ __ack: parsed.__msgId }));
              clientReceived.push(parsed.__payload);
              return;
            }
          } catch {
            // Not JSON
          }
          clientReceived.push(msg);
        });

        await new Promise((r) => setTimeout(r, 50));

        const onAck = mock(() => {});
        serverConnection.sendReliable("reliable payload", { onAck, timeout: 1000 });

        await new Promise((r) => setTimeout(r, 100));

        expect(clientReceived).toContain("reliable payload");
        expect(onAck).toHaveBeenCalledTimes(1);

        client.close();
        await server.close();
      },
      TEST_TIMEOUT
    );
  });

  describe("close", () => {
    test(
      "closes all connections",
      async () => {
        const port = getRandomPort();
        const server = new WebSocketServer({ heartbeat: false });
        await server.listen(port);

        const client1 = new WebSocket(`ws://localhost:${port}`);
        const client2 = new WebSocket(`ws://localhost:${port}`);

        await Promise.all([
          new Promise<void>((resolve) => client1.on("open", resolve)),
          new Promise<void>((resolve) => client2.on("open", resolve)),
        ]);

        const closed1 = new Promise<void>((resolve) => client1.on("close", resolve));
        const closed2 = new Promise<void>((resolve) => client2.on("close", resolve));

        await server.close();

        await Promise.all([closed1, closed2]);

        expect(client1.readyState).toBe(WebSocket.CLOSED);
        expect(client2.readyState).toBe(WebSocket.CLOSED);
      },
      TEST_TIMEOUT
    );
  });
});
