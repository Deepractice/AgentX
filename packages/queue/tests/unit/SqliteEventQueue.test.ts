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

    // Append events
    await queue.append(topic, { seq: 1 });
    await queue.append(topic, { seq: 2 });

    // Create consumer and read
    const consumerId = await queue.createConsumer(topic);
    const entries = await queue.read(consumerId, topic);

    expect(entries).toHaveLength(2);
    expect((entries[0].event as any).seq).toBe(1);
    expect((entries[1].event as any).seq).toBe(2);
  });

  test("multiple consumers read independently", async () => {
    const topic = "session-multi";

    // Append events
    await queue.append(topic, { seq: 1 });
    await queue.append(topic, { seq: 2 });
    await queue.append(topic, { seq: 3 });

    // Consumer A reads all
    const consumerA = await queue.createConsumer(topic);
    const entriesA1 = await queue.read(consumerA, topic);
    expect(entriesA1).toHaveLength(3);

    // Consumer A ACKs up to seq 2
    await queue.ack(consumerA, topic, entriesA1[1].cursor);

    // Consumer B reads all (independent)
    const consumerB = await queue.createConsumer(topic);
    const entriesB1 = await queue.read(consumerB, topic);
    expect(entriesB1).toHaveLength(3);

    // Consumer A reads again (only gets seq 3)
    const entriesA2 = await queue.read(consumerA, topic);
    expect(entriesA2).toHaveLength(1);
    expect((entriesA2[0].event as any).seq).toBe(3);
  });

  test("ack updates consumer cursor", async () => {
    const topic = "session-ack";
    const cursor1 = await queue.append(topic, { seq: 1 });
    const cursor2 = await queue.append(topic, { seq: 2 });

    const consumerId = await queue.createConsumer(topic);

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
    const consumerId = await queue.createConsumer(topic);
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

    // Append 5 messages
    const cursors = [];
    for (let i = 1; i <= 5; i++) {
      cursors.push(await queue.append(topic, { seq: i }));
    }

    // Consumer A consumes up to seq 3
    const consumerA = await queue.createConsumer(topic);
    await queue.ack(consumerA, topic, cursors[2]);

    // Consumer B consumes up to seq 2
    const consumerB = await queue.createConsumer(topic);
    await queue.ack(consumerB, topic, cursors[1]);

    // Cleanup should delete up to cursor[1] (MIN of A and B)
    const cleaned = await queue.cleanup();
    expect(cleaned).toBe(2); // seq 1 and 2

    // Verify remaining entries
    const consumerC = await queue.createConsumer(topic);
    const remaining = await queue.read(consumerC, topic);
    expect(remaining).toHaveLength(3); // seq 3, 4, 5
  });

  test("cleanup handles topics with no consumers", async () => {
    const topic = "orphaned-topic";
    await queue.append(topic, { data: "orphan1" });
    await queue.append(topic, { data: "orphan2" });

    // No consumers created, cleanup should not delete (retention not expired)
    const cleaned1 = await queue.cleanup();
    expect(cleaned1).toBe(0);

    // Create consumer, then delete it
    const consumerId = await queue.createConsumer(topic);
    await queue.deleteConsumer(consumerId, topic);

    // Now topic has no consumers again
    const cleaned2 = await queue.cleanup();
    // Entries still fresh, won't be cleaned
    expect(cleaned2).toBe(0);
  });

  test("deleteConsumer removes subscription", async () => {
    const topic = "session-delete";
    const consumerId = await queue.createConsumer(topic);

    // Consumer exists
    let cursor = await queue.getConsumerCursor(consumerId, topic);
    expect(cursor).toBeNull();

    // Delete consumer
    await queue.deleteConsumer(consumerId, topic);

    // Reading should fail
    await expect(queue.read(consumerId, topic)).rejects.toThrow("Consumer not found");
  });

  test("topics are isolated", async () => {
    await queue.append("topic-a", { from: "a" });
    await queue.append("topic-b", { from: "b" });

    const consumerA = await queue.createConsumer("topic-a");
    const consumerB = await queue.createConsumer("topic-b");

    const entriesA = await queue.read(consumerA, "topic-a");
    const entriesB = await queue.read(consumerB, "topic-b");

    expect(entriesA).toHaveLength(1);
    expect(entriesB).toHaveLength(1);
    expect((entriesA[0].event as any).from).toBe("a");
    expect((entriesB[0].event as any).from).toBe("b");
  });
});
