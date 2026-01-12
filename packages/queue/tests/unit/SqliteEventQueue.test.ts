import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createQueue } from "../../src/createQueue";
import type { EventQueue } from "@agentxjs/types/queue";
import { unlinkSync } from "node:fs";

describe("SqliteEventQueue - Multi-consumer", () => {
  let queue: EventQueue;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/queue-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
    queue = await createQueue({ path: dbPath });
  });

  afterEach(async () => {
    await queue.close();
    try {
      unlinkSync(dbPath);
    } catch {
      // Ignore
    }
  });

  test("append and read events", async () => {
    const topic = "session-123";
    const consumerId = "consumer-1";

    // Append events
    await queue.append(topic, { seq: 1 });
    await queue.append(topic, { seq: 2 });

    // Create consumer and read
    await queue.createConsumer(consumerId, topic);
    const entries = await queue.read(consumerId, topic);

    expect(entries).toHaveLength(2);
    expect((entries[0].event as any).seq).toBe(1);
    expect((entries[1].event as any).seq).toBe(2);
  });

  test("multiple consumers read independently", async () => {
    const topic = "session-multi";
    const consumerA = "consumer-a";
    const consumerB = "consumer-b";

    // Append events
    await queue.append(topic, { seq: 1 });
    await queue.append(topic, { seq: 2 });
    await queue.append(topic, { seq: 3 });

    // Consumer A reads all
    await queue.createConsumer(consumerA, topic);
    const entriesA1 = await queue.read(consumerA, topic);
    expect(entriesA1).toHaveLength(3);

    // Consumer A ACKs up to seq 2
    await queue.ack(consumerA, topic, entriesA1[1].cursor);

    // Consumer B reads all (independent)
    await queue.createConsumer(consumerB, topic);
    const entriesB1 = await queue.read(consumerB, topic);
    expect(entriesB1).toHaveLength(3);

    // Consumer A reads again (only gets seq 3)
    const entriesA2 = await queue.read(consumerA, topic);
    expect(entriesA2).toHaveLength(1);
    expect((entriesA2[0].event as any).seq).toBe(3);
  });

  test("ack updates consumer cursor", async () => {
    const topic = "session-ack";
    const consumerId = "consumer-ack";

    const cursor1 = await queue.append(topic, { seq: 1 });
    const cursor2 = await queue.append(topic, { seq: 2 });

    await queue.createConsumer(consumerId, topic);

    // Initial cursor is null
    let currentCursor = await queue.getConsumerCursor(consumerId, topic);
    expect(currentCursor).toBeNull();

    // ACK first message
    await queue.ack(consumerId, topic, cursor1);
    currentCursor = await queue.getConsumerCursor(consumerId, topic);
    expect(currentCursor).toBe(cursor1);

    // ACK second message
    await queue.ack(consumerId, topic, cursor2);
    currentCursor = await queue.getConsumerCursor(consumerId, topic);
    expect(currentCursor).toBe(cursor2);
  });

  test("subscribe receives new events", async () => {
    const topic = "session-sub";
    const consumerId = "consumer-sub";

    await queue.createConsumer(consumerId, topic);
    const received: unknown[] = [];

    const unsubscribe = queue.subscribe(consumerId, topic, (entry) => {
      received.push(entry.event);
    });

    await queue.append(topic, { msg: "first" });
    await queue.append(topic, { msg: "second" });

    // Small delay for async notification
    await new Promise((r) => setTimeout(r, 10));

    expect(received).toHaveLength(2);
    expect((received[0] as any).msg).toBe("first");
    expect((received[1] as any).msg).toBe("second");

    unsubscribe();

    // After unsubscribe, new events should not be received
    await queue.append(topic, { msg: "third" });
    await new Promise((r) => setTimeout(r, 10));
    expect(received).toHaveLength(2);
  });

  test("cleanup removes entries consumed by all consumers", async () => {
    const topic = "session-cleanup";
    const consumerA = "consumer-cleanup-a";
    const consumerB = "consumer-cleanup-b";
    const consumerC = "consumer-cleanup-c";

    // Append 5 messages
    const cursors = [];
    for (let i = 1; i <= 5; i++) {
      cursors.push(await queue.append(topic, { seq: i }));
    }

    // Consumer A consumes up to seq 3
    await queue.createConsumer(consumerA, topic);
    await queue.ack(consumerA, topic, cursors[2]);

    // Consumer B consumes up to seq 2
    await queue.createConsumer(consumerB, topic);
    await queue.ack(consumerB, topic, cursors[1]);

    // Cleanup should delete up to cursor[1] (MIN of A and B)
    const cleaned = await queue.cleanup();
    expect(cleaned).toBe(2); // seq 1 and 2

    // Verify remaining entries
    await queue.createConsumer(consumerC, topic);
    const remaining = await queue.read(consumerC, topic);
    expect(remaining).toHaveLength(3); // seq 3, 4, 5
  });

  test("cleanup handles topics with no consumers", async () => {
    const topic = "orphaned-topic";
    const consumerId = "consumer-orphan";

    await queue.append(topic, { data: "orphan1" });
    await queue.append(topic, { data: "orphan2" });

    // No consumers created, cleanup should not delete (retention not expired)
    const cleaned1 = await queue.cleanup();
    expect(cleaned1).toBe(0);

    // Create consumer, then delete it
    await queue.createConsumer(consumerId, topic);
    await queue.deleteConsumer(consumerId, topic);

    // Now topic has no consumers again
    const cleaned2 = await queue.cleanup();
    // Entries still fresh, won't be cleaned by TTL
    expect(cleaned2).toBe(0);
  });

  test("deleteConsumer removes subscription", async () => {
    const topic = "session-delete";
    const consumerId = "consumer-delete";

    await queue.createConsumer(consumerId, topic);

    // Consumer exists
    let cursor = await queue.getConsumerCursor(consumerId, topic);
    expect(cursor).toBeNull();

    // Delete consumer
    await queue.deleteConsumer(consumerId, topic);

    // Reading should fail
    await expect(queue.read(consumerId, topic)).rejects.toThrow("Consumer not found");
  });

  test("topics are isolated", async () => {
    const consumerA = "consumer-topic-a";
    const consumerB = "consumer-topic-b";

    await queue.append("topic-a", { from: "a" });
    await queue.append("topic-b", { from: "b" });

    await queue.createConsumer(consumerA, "topic-a");
    await queue.createConsumer(consumerB, "topic-b");

    const entriesA = await queue.read(consumerA, "topic-a");
    const entriesB = await queue.read(consumerB, "topic-b");

    expect(entriesA).toHaveLength(1);
    expect(entriesB).toHaveLength(1);
    expect((entriesA[0].event as any).from).toBe("a");
    expect((entriesB[0].event as any).from).toBe("b");
  });

  test("createConsumer preserves cursor on reconnection", async () => {
    const topic = "session-reconnect";
    const clientId = "client-reconnect";

    // First connection
    await queue.createConsumer(clientId, topic);
    await queue.append(topic, { seq: 1 });
    await queue.append(topic, { seq: 2 });

    const entries1 = await queue.read(clientId, topic);
    expect(entries1).toHaveLength(2);

    // ACK first message
    await queue.ack(clientId, topic, entries1[0].cursor);

    // "Reconnect" - createConsumer again with same clientId
    await queue.createConsumer(clientId, topic);

    // Cursor should be preserved
    const cursor = await queue.getConsumerCursor(clientId, topic);
    expect(cursor).toBe(entries1[0].cursor);

    // Should only get unread message
    const entries2 = await queue.read(clientId, topic);
    expect(entries2).toHaveLength(1);
    expect((entries2[0].event as any).seq).toBe(2);
  });
});
