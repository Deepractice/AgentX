/**
 * Thinking Levels E2E Test
 *
 * Tests disabled / low / medium / high thinking configurations
 * with real LLM calls.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentContext } from "@agentxjs/core/driver";
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
  tempDir = await mkdtemp(join(tmpdir(), "agentx-thinking-levels-"));
  persistence = await createPersistence(sqliteDriver({ path: join(tempDir, "test.db") }));
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

async function runWithThinking(
  thinkingLevel: "disabled" | "low" | "medium" | "high" | undefined
): Promise<{ thinkingCount: number; textCount: number; events: string[] }> {
  const createDriver = (config: AgentContext) =>
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
      containerId: "default",
      containerRepository: persistence.containers,
      imageRepository: persistence.images,
      sessionRepository: persistence.sessions,
      eventBus,
    },
    createDriver
  );

  const { createImage } = await import("@agentxjs/core/image");
  const image = await createImage(
    {
      containerId: "default",
      name: `Thinking ${thinkingLevel ?? "default"}`,
      systemPrompt: "Answer briefly.",
      thinking: thinkingLevel,
    },
    {
      imageRepository: persistence.images,
      sessionRepository: persistence.sessions,
    }
  );

  const agent = await runtime.createAgent({ imageId: image.toRecord().imageId });

  const thinkingDeltas: string[] = [];
  const textDeltas: string[] = [];
  const eventTypes: string[] = [];

  eventBus.onAny((event: any) => {
    if (!eventTypes.includes(event.type)) eventTypes.push(event.type);
    if (event.type === "thinking_delta") thinkingDeltas.push(event.data.text);
    if (event.type === "text_delta") textDeltas.push(event.data.text);
  });

  const done = new Promise<void>((resolve) => {
    eventBus.onAny((event: any) => {
      if (event.type === "message_stop" && event.data?.stopReason === "end_turn") {
        setTimeout(resolve, 200);
      }
    });
  });

  await runtime.receive(agent.instanceId, "What is 2+2?");
  await done;

  await runtime.destroyAgent(agent.instanceId);
  await runtime.shutdown();

  return {
    thinkingCount: thinkingDeltas.length,
    textCount: textDeltas.length,
    events: eventTypes,
  };
}

describe("Thinking levels", () => {
  test("disabled: no thinking_delta events", async () => {
    if (!apiKey) return;
    const result = await runWithThinking("disabled");
    console.log(`  disabled: thinking=${result.thinkingCount}, text=${result.textCount}`);
    expect(result.thinkingCount).toBe(0);
    expect(result.textCount).toBeGreaterThan(0);
  }, 60_000);

  test("low: has thinking (budgetTokens=5000)", async () => {
    if (!apiKey) return;
    const result = await runWithThinking("low");
    console.log(`  low: thinking=${result.thinkingCount}, text=${result.textCount}`);
    expect(result.thinkingCount).toBeGreaterThan(0);
    expect(result.textCount).toBeGreaterThan(0);
  }, 60_000);

  test("medium: has thinking (budgetTokens=10000)", async () => {
    if (!apiKey) return;
    const result = await runWithThinking("medium");
    console.log(`  medium: thinking=${result.thinkingCount}, text=${result.textCount}`);
    expect(result.thinkingCount).toBeGreaterThan(0);
    expect(result.textCount).toBeGreaterThan(0);
  }, 60_000);

  test("high: has thinking (budgetTokens=32000)", async () => {
    if (!apiKey) return;
    const result = await runWithThinking("high");
    console.log(`  high: thinking=${result.thinkingCount}, text=${result.textCount}`);
    expect(result.thinkingCount).toBeGreaterThan(0);
    expect(result.textCount).toBeGreaterThan(0);
  }, 60_000);

  test("undefined (default): no thinking", async () => {
    if (!apiKey) return;
    const result = await runWithThinking(undefined);
    console.log(`  default: thinking=${result.thinkingCount}, text=${result.textCount}`);
    expect(result.thinkingCount).toBe(0);
    expect(result.textCount).toBeGreaterThan(0);
  }, 60_000);
});
