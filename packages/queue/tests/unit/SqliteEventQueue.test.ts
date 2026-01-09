import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createQueue } from "../../src/createQueue";
import type { EventQueue } from "@agentxjs/types/queue";
import { unlinkSync } from "node:fs";

describe("SqliteEventQueue", () => {
  let queue: EventQueue;
  let dbPath: string;

  beforeEach(async () => {
    // Use unique temp file for each test to avoid shared state
    dbPath = `/tmp/queue-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
    queue = await createQueue({ path: dbPath });
  });

  afterEach(async () => {
    await queue.close();
    try {
      unlinkSync(dbPath);
    } catch {
      // Ignore cleanup errors
    }
  });

  test("append and read events", async () => {
    const topic = "session-123";
    const event1 = { type: "text_delta", data: { text: "Hello" } };
    const event2 = { type: "text_delta", data: { text: "World" } };

    const cursor1 = await queue.append(topic, event1);
    const cursor2 = await queue.append(topic, event2);

    expect(cursor1).toBeTruthy();
    expect(cursor2).toBeTruthy();
    expect(cursor1).not.toBe(cursor2);

    const entries = await queue.read(topic);
    expect(entries).toHaveLength(2);
    expect(entries[0].event).toEqual(event1);
    expect(entries[1].event).toEqual(event2);
  });

  test("read after cursor", async () => {
    const topic = "session-456";
    const cursor1 = await queue.append(topic, { seq: 1 });
    const cursor2 = await queue.append(topic, { seq: 2 });
    await queue.append(topic, { seq: 3 });

    // Read after cursor1 should return events 2 and 3
    const entries = await queue.read(topic, cursor1);
    expect(entries).toHaveLength(2);
    expect((entries[0].event as any).seq).toBe(2);
    expect((entries[1].event as any).seq).toBe(3);

    // Read after cursor2 should return only event 3
    const entries2 = await queue.read(topic, cursor2);
    expect(entries2).toHaveLength(1);
    expect((entries2[0].event as any).seq).toBe(3);
  });

  test("acknowledge entries", async () => {
    const topic = "session-789";
    const cursor = await queue.append(topic, { data: "test" });

    const beforeAck = await queue.read(topic);
    expect(beforeAck[0].acknowledged).toBe(false);
    expect(beforeAck[0].acknowledgedAt).toBeNull();

    await queue.ack(topic, cursor);

    const afterAck = await queue.read(topic);
    expect(afterAck[0].acknowledged).toBe(true);
    expect(afterAck[0].acknowledgedAt).toBeTypeOf("number");
  });

  test("subscribe receives new events", async () => {
    const topic = "session-sub";
    const received: unknown[] = [];

    const unsubscribe = queue.subscribe(topic, (entry) => {
      received.push(entry.event);
    });

    await queue.append(topic, { msg: "first" });
    await queue.append(topic, { msg: "second" });

    expect(received).toHaveLength(2);
    expect((received[0] as any).msg).toBe("first");
    expect((received[1] as any).msg).toBe("second");

    unsubscribe();

    // After unsubscribe, new events should not be received
    await queue.append(topic, { msg: "third" });
    expect(received).toHaveLength(2);
  });

  test("getLatestCursor returns correct cursor", async () => {
    const topic = "session-cursor";

    // Empty topic
    const emptyCursor = await queue.getLatestCursor(topic);
    expect(emptyCursor).toBeNull();

    await queue.append(topic, { seq: 1 });
    const cursor2 = await queue.append(topic, { seq: 2 });

    const latestCursor = await queue.getLatestCursor(topic);
    expect(latestCursor).toBe(cursor2);
  });

  test("topics are isolated", async () => {
    await queue.append("topic-a", { from: "a" });
    await queue.append("topic-b", { from: "b" });

    const entriesA = await queue.read("topic-a");
    const entriesB = await queue.read("topic-b");

    expect(entriesA).toHaveLength(1);
    expect(entriesB).toHaveLength(1);
    expect((entriesA[0].event as any).from).toBe("a");
    expect((entriesB[0].event as any).from).toBe("b");
  });

  test("cleanup removes old acknowledged entries", async () => {
    const topic = "session-cleanup";

    // Create queue with very short retention using unique path
    const cleanupDbPath = `/tmp/queue-cleanup-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
    const shortRetentionQueue = await createQueue({
      path: cleanupDbPath,
      ackRetentionMs: 1, // 1ms retention
      cleanupIntervalMs: 0, // Disable auto cleanup
    });

    const cursor = await shortRetentionQueue.append(topic, { data: "old" });
    await shortRetentionQueue.ack(topic, cursor);

    // Wait a bit for the entry to become old
    await new Promise((r) => setTimeout(r, 10));

    const cleaned = await shortRetentionQueue.cleanup();
    expect(cleaned).toBe(1);

    const entries = await shortRetentionQueue.read(topic);
    expect(entries).toHaveLength(0);

    await shortRetentionQueue.close();
    try {
      unlinkSync(cleanupDbPath);
    } catch {
      // Ignore
    }
  });
});
