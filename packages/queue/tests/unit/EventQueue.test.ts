import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createQueue } from "../../src/createQueue";
import type { EventQueue, QueueEntry } from "@agentxjs/types/queue";
import { unlinkSync } from "node:fs";

describe("EventQueue", () => {
  let queue: EventQueue;
  let dbPath: string;

  beforeEach(() => {
    dbPath = `/tmp/queue-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
    queue = createQueue({ path: dbPath });
  });

  afterEach(async () => {
    await queue.close();
    try {
      unlinkSync(dbPath);
      unlinkSync(`${dbPath}-wal`);
      unlinkSync(`${dbPath}-shm`);
    } catch {
      // Ignore
    }
  });

  describe("publish", () => {
    test("returns cursor", () => {
      const cursor = queue.publish("topic-1", { data: "test" });
      expect(cursor).toMatch(/^[a-z0-9]+-\d{4}$/);
    });

    test("generates unique cursors", () => {
      const cursor1 = queue.publish("topic-1", { seq: 1 });
      const cursor2 = queue.publish("topic-1", { seq: 2 });
      expect(cursor1).not.toBe(cursor2);
    });
  });

  describe("subscribe", () => {
    test("receives published events", async () => {
      const received: QueueEntry[] = [];

      queue.subscribe("topic-1", (entry) => {
        received.push(entry);
      });

      queue.publish("topic-1", { msg: "first" });
      queue.publish("topic-1", { msg: "second" });

      // Small delay for sync delivery
      await new Promise((r) => setTimeout(r, 10));

      expect(received).toHaveLength(2);
      expect((received[0].event as any).msg).toBe("first");
      expect((received[1].event as any).msg).toBe("second");
    });

    test("only receives events for subscribed topic", async () => {
      const received: QueueEntry[] = [];

      queue.subscribe("topic-a", (entry) => {
        received.push(entry);
      });

      queue.publish("topic-a", { from: "a" });
      queue.publish("topic-b", { from: "b" });

      await new Promise((r) => setTimeout(r, 10));

      expect(received).toHaveLength(1);
      expect((received[0].event as any).from).toBe("a");
    });

    test("unsubscribe stops receiving events", async () => {
      const received: QueueEntry[] = [];

      const unsubscribe = queue.subscribe("topic-1", (entry) => {
        received.push(entry);
      });

      queue.publish("topic-1", { msg: "first" });
      await new Promise((r) => setTimeout(r, 10));

      unsubscribe();

      queue.publish("topic-1", { msg: "second" });
      await new Promise((r) => setTimeout(r, 10));

      expect(received).toHaveLength(1);
    });

    test("multiple subscribers receive same event", async () => {
      const received1: QueueEntry[] = [];
      const received2: QueueEntry[] = [];

      queue.subscribe("topic-1", (entry) => received1.push(entry));
      queue.subscribe("topic-1", (entry) => received2.push(entry));

      queue.publish("topic-1", { msg: "broadcast" });

      await new Promise((r) => setTimeout(r, 10));

      expect(received1).toHaveLength(1);
      expect(received2).toHaveLength(1);
    });
  });

  describe("ack and getCursor", () => {
    test("ack updates cursor", async () => {
      const cursor1 = queue.publish("topic-1", { seq: 1 });
      queue.publish("topic-1", { seq: 2 });

      // Initially no cursor
      let cursor = await queue.getCursor("consumer-1", "topic-1");
      expect(cursor).toBeNull();

      // ACK first message
      await queue.ack("consumer-1", "topic-1", cursor1);
      cursor = await queue.getCursor("consumer-1", "topic-1");
      expect(cursor).toBe(cursor1);
    });

    test("multiple consumers track independently", async () => {
      const cursor1 = queue.publish("topic-1", { seq: 1 });
      const cursor2 = queue.publish("topic-1", { seq: 2 });

      await queue.ack("consumer-a", "topic-1", cursor1);
      await queue.ack("consumer-b", "topic-1", cursor2);

      const cursorA = await queue.getCursor("consumer-a", "topic-1");
      const cursorB = await queue.getCursor("consumer-b", "topic-1");

      expect(cursorA).toBe(cursor1);
      expect(cursorB).toBe(cursor2);
    });
  });

  describe("recover", () => {
    test("recovers all events when no cursor provided", async () => {
      queue.publish("topic-1", { seq: 1 });
      queue.publish("topic-1", { seq: 2 });
      queue.publish("topic-1", { seq: 3 });

      // Wait for async persistence
      await new Promise((r) => setTimeout(r, 50));

      const entries = await queue.recover("topic-1");

      expect(entries).toHaveLength(3);
      expect((entries[0].event as any).seq).toBe(1);
      expect((entries[2].event as any).seq).toBe(3);
    });

    test("recovers events after cursor", async () => {
      const cursor1 = queue.publish("topic-1", { seq: 1 });
      queue.publish("topic-1", { seq: 2 });
      queue.publish("topic-1", { seq: 3 });

      await new Promise((r) => setTimeout(r, 50));

      const entries = await queue.recover("topic-1", cursor1);

      expect(entries).toHaveLength(2);
      expect((entries[0].event as any).seq).toBe(2);
      expect((entries[1].event as any).seq).toBe(3);
    });

    test("respects limit", async () => {
      for (let i = 1; i <= 10; i++) {
        queue.publish("topic-1", { seq: i });
      }

      await new Promise((r) => setTimeout(r, 50));

      const entries = await queue.recover("topic-1", undefined, 5);

      expect(entries).toHaveLength(5);
    });

    test("topics are isolated", async () => {
      queue.publish("topic-a", { from: "a" });
      queue.publish("topic-b", { from: "b" });

      await new Promise((r) => setTimeout(r, 50));

      const entriesA = await queue.recover("topic-a");
      const entriesB = await queue.recover("topic-b");

      expect(entriesA).toHaveLength(1);
      expect(entriesB).toHaveLength(1);
      expect((entriesA[0].event as any).from).toBe("a");
      expect((entriesB[0].event as any).from).toBe("b");
    });
  });

  describe("integration: reconnection flow", () => {
    test("consumer can recover missed events on reconnection", async () => {
      const consumerId = "client-123";
      const topic = "session-456";

      // Initial events
      const cursor1 = queue.publish(topic, { seq: 1 });
      queue.publish(topic, { seq: 2 });

      // Consumer ACKs first event
      await queue.ack(consumerId, topic, cursor1);

      // More events published while "disconnected"
      queue.publish(topic, { seq: 3 });
      queue.publish(topic, { seq: 4 });

      await new Promise((r) => setTimeout(r, 50));

      // On reconnection, get last ACKed cursor
      const lastCursor = await queue.getCursor(consumerId, topic);
      expect(lastCursor).toBe(cursor1);

      // Recover missed events
      const missed = await queue.recover(topic, lastCursor);

      expect(missed).toHaveLength(3); // seq 2, 3, 4
      expect((missed[0].event as any).seq).toBe(2);
      expect((missed[2].event as any).seq).toBe(4);
    });
  });
});
