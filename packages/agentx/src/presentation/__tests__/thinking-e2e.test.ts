/**
 * Thinking E2E Test
 *
 * Verifies that thinking/reasoning content is correctly emitted
 * when thinking is enabled on the agent.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DriverConfig } from "@agentxjs/core/driver";
import { EventBusImpl } from "@agentxjs/core/event";
import { createAgentXRuntime } from "@agentxjs/core/runtime";
import { createMonoDriver } from "@agentxjs/mono-driver";
import { createPersistence, sqliteDriver } from "@agentxjs/node-platform/persistence";

let tempDir: string;
let persistence: Awaited<ReturnType<typeof createPersistence>>;

const apiKey = process.env.DEEPRACTICE_API_KEY;
const baseUrl = process.env.DEEPRACTICE_BASE_URL;
const model = process.env.DEEPRACTICE_MODEL;

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "agentx-thinking-e2e-"));
  persistence = await createPersistence(sqliteDriver({ path: join(tempDir, "test.db") }));
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("Thinking E2E", () => {
  test("thinking: high produces thinking_delta events", async () => {
    if (!apiKey) {
      console.log("Skipping: no API key");
      return;
    }

    const createDriver = (config: DriverConfig) =>
      createMonoDriver({
        ...config,
        apiKey: apiKey!,
        baseUrl,
        model: model || "claude-sonnet-4-20250514",
        provider: "anthropic",
        maxSteps: 1,
      });

    const eventBus = new EventBusImpl();
    const runtime = createAgentXRuntime(
      {
        containerRepository: persistence.containers,
        imageRepository: persistence.images,
        sessionRepository: persistence.sessions,
        eventBus,
      },
      createDriver
    );

    // Create image WITH thinking enabled
    const { createImage } = await import("@agentxjs/core/image");
    const image = await createImage(
      {
        containerId: "default",
        name: "Thinking Agent",
        embody: {
          systemPrompt: "You are a helpful assistant. Think carefully before answering.",
          thinking: "high",
        },
      },
      {
        imageRepository: persistence.images,
        sessionRepository: persistence.sessions,
      }
    );

    const imageId = image.toRecord().imageId;
    const agent = await runtime.createAgent({ imageId });

    // Track events
    const thinkingDeltas: string[] = [];
    const textDeltas: string[] = [];
    const allEventTypes: string[] = [];

    eventBus.onAny((event: any) => {
      allEventTypes.push(event.type);
      if (event.type === "thinking_delta") {
        thinkingDeltas.push(event.data.text);
      }
      if (event.type === "text_delta") {
        textDeltas.push(event.data.text);
      }
    });

    const responsePromise = new Promise<void>((resolve) => {
      eventBus.onAny((event: any) => {
        if (event.type === "message_stop" && event.data?.stopReason === "end_turn") {
          setTimeout(resolve, 300);
        }
      });
    });

    await runtime.receive(agent.instanceId, "What is 17 * 23? Show your work.");
    await responsePromise;

    console.log("\n=== Thinking E2E Results ===");
    console.log(`  Event types: ${[...new Set(allEventTypes)].join(", ")}`);
    console.log(`  Thinking deltas: ${thinkingDeltas.length}`);
    console.log(`  Text deltas: ${textDeltas.length}`);
    if (thinkingDeltas.length > 0) {
      console.log(`  Thinking preview: ${thinkingDeltas.join("").substring(0, 100)}...`);
    }
    console.log(`  Text preview: ${textDeltas.join("").substring(0, 100)}...`);

    // THE KEY ASSERTION: thinking_delta events should exist
    expect(thinkingDeltas.length).toBeGreaterThan(0);
    expect(textDeltas.length).toBeGreaterThan(0);

    await runtime.destroyAgent(agent.instanceId);
    await runtime.shutdown();
  }, 60_000);
});
