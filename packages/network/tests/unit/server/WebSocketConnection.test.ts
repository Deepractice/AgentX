import { describe, test, expect, beforeEach, mock } from "bun:test";
import { WebSocketConnection } from "../../../src/server/WebSocketConnection";
import { EventEmitter } from "node:events";

/**
 * Mock WebSocket that extends EventEmitter for event handling
 */
class MockWebSocket extends EventEmitter {
  readyState = 1; // OPEN
  sentMessages: string[] = [];

  send(message: string) {
    this.sentMessages.push(message);
  }

  ping() {
    // Mock ping
  }

  terminate() {
    this.readyState = 3; // CLOSED
  }

  close() {
    this.readyState = 3;
    this.emit("close");
  }

  // Simulate receiving a message
  receiveMessage(message: string) {
    this.emit("message", Buffer.from(message));
  }
}

describe("WebSocketConnection", () => {
  let mockWs: MockWebSocket;
  let connection: WebSocketConnection;

  beforeEach(() => {
    mockWs = new MockWebSocket();
    connection = new WebSocketConnection(mockWs as any, { heartbeat: false });
  });

  describe("basic properties", () => {
    test("has unique id", () => {
      expect(connection.id).toMatch(/^conn_\d+_[a-z0-9]+$/);
    });

    test("different connections have different ids", () => {
      const conn2 = new WebSocketConnection(new MockWebSocket() as any, { heartbeat: false });
      expect(connection.id).not.toBe(conn2.id);
    });
  });

  describe("send", () => {
    test("sends message when connection is open", () => {
      connection.send("hello");
      expect(mockWs.sentMessages).toContain("hello");
    });

    test("does not send when connection is closed", () => {
      mockWs.readyState = 3; // CLOSED
      connection.send("hello");
      expect(mockWs.sentMessages).toHaveLength(0);
    });
  });

  describe("sendReliable", () => {
    test("sends wrapped message with __msgId", () => {
      connection.sendReliable("test payload", { onAck: () => {} });

      expect(mockWs.sentMessages).toHaveLength(1);
      const sent = JSON.parse(mockWs.sentMessages[0]);
      expect(sent.__msgId).toMatch(/^conn_.*_1$/);
      expect(sent.__payload).toBe("test payload");
    });

    test("sends plain message when no onAck callback", () => {
      connection.sendReliable("plain message");

      expect(mockWs.sentMessages).toHaveLength(1);
      expect(mockWs.sentMessages[0]).toBe("plain message");
    });

    test("calls onAck when ACK received", async () => {
      const onAck = mock(() => {});
      connection.sendReliable("test", { onAck });

      // Extract msgId from sent message
      const sent = JSON.parse(mockWs.sentMessages[0]);
      const msgId = sent.__msgId;

      // Simulate ACK response
      mockWs.receiveMessage(JSON.stringify({ __ack: msgId }));

      // Small delay for async processing
      await new Promise((r) => setTimeout(r, 10));

      expect(onAck).toHaveBeenCalledTimes(1);
    });

    test("calls onTimeout when ACK not received", async () => {
      const onAck = mock(() => {});
      const onTimeout = mock(() => {});

      connection.sendReliable("test", {
        onAck,
        onTimeout,
        timeout: 50, // 50ms timeout
      });

      // Wait for timeout
      await new Promise((r) => setTimeout(r, 100));

      expect(onAck).not.toHaveBeenCalled();
      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    test("does not call onAck after timeout", async () => {
      const onAck = mock(() => {});
      const onTimeout = mock(() => {});

      connection.sendReliable("test", {
        onAck,
        onTimeout,
        timeout: 50,
      });

      // Extract msgId
      const sent = JSON.parse(mockWs.sentMessages[0]);
      const msgId = sent.__msgId;

      // Wait for timeout
      await new Promise((r) => setTimeout(r, 100));

      // Late ACK should be ignored
      mockWs.receiveMessage(JSON.stringify({ __ack: msgId }));
      await new Promise((r) => setTimeout(r, 10));

      expect(onAck).not.toHaveBeenCalled();
      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    test("calls onTimeout immediately when connection closed", () => {
      const onTimeout = mock(() => {});
      mockWs.readyState = 3; // CLOSED

      connection.sendReliable("test", { onAck: () => {}, onTimeout });

      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    test("increments msgId for each reliable message", () => {
      connection.sendReliable("msg1", { onAck: () => {} });
      connection.sendReliable("msg2", { onAck: () => {} });
      connection.sendReliable("msg3", { onAck: () => {} });

      const ids = mockWs.sentMessages.map((m) => JSON.parse(m).__msgId);
      expect(ids[0]).toMatch(/_1$/);
      expect(ids[1]).toMatch(/_2$/);
      expect(ids[2]).toMatch(/_3$/);
    });
  });

  describe("message handling", () => {
    test("passes regular messages to handlers", () => {
      const received: string[] = [];
      connection.onMessage((msg) => received.push(msg));

      mockWs.receiveMessage("hello");
      mockWs.receiveMessage("world");

      expect(received).toEqual(["hello", "world"]);
    });

    test("does not pass ACK messages to handlers", () => {
      const received: string[] = [];
      connection.onMessage((msg) => received.push(msg));

      mockWs.receiveMessage(JSON.stringify({ __ack: "msg_123" }));

      expect(received).toHaveLength(0);
    });

    test("unsubscribe removes handler", () => {
      const received: string[] = [];
      const unsubscribe = connection.onMessage((msg) => received.push(msg));

      mockWs.receiveMessage("first");
      unsubscribe();
      mockWs.receiveMessage("second");

      expect(received).toEqual(["first"]);
    });
  });

  describe("close handling", () => {
    test("calls close handlers on close", () => {
      const onClose = mock(() => {});
      connection.onClose(onClose);

      mockWs.emit("close");

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test("unsubscribe removes close handler", () => {
      const onClose = mock(() => {});
      const unsubscribe = connection.onClose(onClose);

      unsubscribe();
      mockWs.emit("close");

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    test("calls error handlers on error", () => {
      const onError = mock(() => {});
      connection.onError(onError);

      const error = new Error("test error");
      mockWs.emit("error", error);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe("close", () => {
    test("clears pending ACKs on close", async () => {
      const onAck = mock(() => {});
      const onTimeout = mock(() => {});

      connection.sendReliable("test", { onAck, onTimeout, timeout: 5000 });
      connection.close();

      // Wait a bit
      await new Promise((r) => setTimeout(r, 50));

      // Neither should be called after close
      expect(onAck).not.toHaveBeenCalled();
      expect(onTimeout).not.toHaveBeenCalled();
    });
  });
});
