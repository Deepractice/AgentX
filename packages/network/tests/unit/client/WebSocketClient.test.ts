import { describe, test, expect, mock } from "bun:test";
import { WebSocketClient } from "../../../src/client/WebSocketClient";
import { WebSocketServer } from "../../../src/server/WebSocketServer";

// Get a random available port
function getRandomPort(): number {
  return 30000 + Math.floor(Math.random() * 10000);
}

const TEST_TIMEOUT = 10000;

describe("WebSocketClient", () => {
  describe("connect", () => {
    test(
      "connects to server successfully",
      async () => {
        const port = getRandomPort();
        const server = new WebSocketServer({ heartbeat: false });
        await server.listen(port);

        const client = new WebSocketClient({ serverUrl: `ws://localhost:${port}` });
        await client.connect();

        expect(client.readyState).toBe("open");

        client.close();
        await server.close();
      },
      TEST_TIMEOUT
    );

    test(
      "throws if already connected",
      async () => {
        const port = getRandomPort();
        const server = new WebSocketServer({ heartbeat: false });
        await server.listen(port);

        const client = new WebSocketClient({ serverUrl: `ws://localhost:${port}` });
        await client.connect();

        await expect(client.connect()).rejects.toThrow("Already connected");

        client.close();
        await server.close();
      },
      TEST_TIMEOUT
    );
  });

  describe("send and receive", () => {
    test(
      "sends messages to server",
      async () => {
        const port = getRandomPort();
        const server = new WebSocketServer({ heartbeat: false });
        await server.listen(port);

        const serverReceived: string[] = [];
        server.onConnection((conn) => {
          conn.onMessage((msg) => serverReceived.push(msg));
        });

        const client = new WebSocketClient({ serverUrl: `ws://localhost:${port}` });
        await client.connect();

        await new Promise((r) => setTimeout(r, 50));

        client.send("hello server");

        await new Promise((r) => setTimeout(r, 50));

        expect(serverReceived).toContain("hello server");

        client.close();
        await server.close();
      },
      TEST_TIMEOUT
    );

    test(
      "receives messages from server",
      async () => {
        const port = getRandomPort();
        const server = new WebSocketServer({ heartbeat: false });
        await server.listen(port);

        let serverConnection: any;
        server.onConnection((conn) => {
          serverConnection = conn;
        });

        const client = new WebSocketClient({ serverUrl: `ws://localhost:${port}` });
        const received: string[] = [];
        client.onMessage((msg) => received.push(msg));

        await client.connect();
        await new Promise((r) => setTimeout(r, 50));

        serverConnection.send("hello client");

        await new Promise((r) => setTimeout(r, 50));

        expect(received).toContain("hello client");

        client.close();
        await server.close();
      },
      TEST_TIMEOUT
    );
  });

  describe("auto-ACK for reliable messages", () => {
    test(
      "automatically sends ACK for reliable messages",
      async () => {
        const port = getRandomPort();
        const server = new WebSocketServer({ heartbeat: false });
        await server.listen(port);

        let serverConnection: any;
        server.onConnection((conn) => {
          serverConnection = conn;
        });

        const client = new WebSocketClient({ serverUrl: `ws://localhost:${port}` });
        const received: string[] = [];
        client.onMessage((msg) => received.push(msg));

        await client.connect();
        await new Promise((r) => setTimeout(r, 50));

        const onAck = mock(() => {});
        serverConnection.sendReliable("reliable message", { onAck, timeout: 1000 });

        await new Promise((r) => setTimeout(r, 100));

        // Client should have received the unwrapped payload
        expect(received).toContain("reliable message");

        // Server should have received ACK
        expect(onAck).toHaveBeenCalledTimes(1);

        client.close();
        await server.close();
      },
      TEST_TIMEOUT
    );

    test(
      "passes through regular messages without ACK",
      async () => {
        const port = getRandomPort();
        const server = new WebSocketServer({ heartbeat: false });
        await server.listen(port);

        let serverConnection: any;
        const serverReceived: string[] = [];
        server.onConnection((conn) => {
          serverConnection = conn;
          conn.onMessage((msg) => serverReceived.push(msg));
        });

        const client = new WebSocketClient({ serverUrl: `ws://localhost:${port}` });
        const received: string[] = [];
        client.onMessage((msg) => received.push(msg));

        await client.connect();
        await new Promise((r) => setTimeout(r, 50));

        // Send regular message (not wrapped)
        serverConnection.send("regular message");

        await new Promise((r) => setTimeout(r, 50));

        expect(received).toContain("regular message");

        // Server should not receive any ACK (no __ack messages)
        expect(serverReceived.some((m) => m.includes("__ack"))).toBe(false);

        client.close();
        await server.close();
      },
      TEST_TIMEOUT
    );
  });

  describe("event handlers", () => {
    test(
      "onOpen is called when connected",
      async () => {
        const port = getRandomPort();
        const server = new WebSocketServer({ heartbeat: false });
        await server.listen(port);

        const client = new WebSocketClient({ serverUrl: `ws://localhost:${port}` });
        const onOpen = mock(() => {});
        client.onOpen(onOpen);

        await client.connect();

        expect(onOpen).toHaveBeenCalledTimes(1);

        client.close();
        await server.close();
      },
      TEST_TIMEOUT
    );

    test(
      "onClose is called when disconnected",
      async () => {
        const port = getRandomPort();
        const server = new WebSocketServer({ heartbeat: false });
        await server.listen(port);

        const client = new WebSocketClient({ serverUrl: `ws://localhost:${port}` });
        const onClose = mock(() => {});
        client.onClose(onClose);

        await client.connect();
        client.close();

        await new Promise((r) => setTimeout(r, 50));

        expect(onClose).toHaveBeenCalledTimes(1);

        await server.close();
      },
      TEST_TIMEOUT
    );

    test(
      "unsubscribe removes handler",
      async () => {
        const port = getRandomPort();
        const server = new WebSocketServer({ heartbeat: false });
        await server.listen(port);

        let serverConnection: any;
        server.onConnection((conn) => {
          serverConnection = conn;
        });

        const client = new WebSocketClient({ serverUrl: `ws://localhost:${port}` });
        const received: string[] = [];
        const unsubscribe = client.onMessage((msg) => received.push(msg));

        await client.connect();
        await new Promise((r) => setTimeout(r, 50));

        serverConnection.send("first");
        await new Promise((r) => setTimeout(r, 50));

        unsubscribe();

        serverConnection.send("second");
        await new Promise((r) => setTimeout(r, 50));

        expect(received).toEqual(["first"]);

        client.close();
        await server.close();
      },
      TEST_TIMEOUT
    );
  });

  describe("dispose", () => {
    test(
      "cleans up all resources",
      async () => {
        const port = getRandomPort();
        const server = new WebSocketServer({ heartbeat: false });
        await server.listen(port);

        const client = new WebSocketClient({ serverUrl: `ws://localhost:${port}` });
        await client.connect();

        client.dispose();

        expect(client.readyState).toBe("closed");

        await server.close();
      },
      TEST_TIMEOUT
    );
  });
});
