/**
 * Performance Test: Real RoleX with "sean" role
 *
 * Measures each layer:
 * 1. context.create() — initialize RoleX builder + activate role
 * 2. context.schema — get cognitive schema
 * 3. context.project() — project current role state
 * 4. context.capabilities() — get tools
 * 5. LLM call — with full context + tools
 */

import { describe, expect, test } from "bun:test";
import { createMonoDriver } from "../src/MonoDriver";

const apiKey = "2511410b-bd2f-44d4-bfc7-5fb7799ba751";
const baseUrl = "https://ark.cn-beijing.volces.com/api/coding";

const question = "Say hello in one word.";

async function measureReply(driver: ReturnType<typeof createMonoDriver>, content: string) {
  const message = {
    id: `msg_${Date.now()}`,
    role: "user" as const,
    subtype: "user" as const,
    content,
    timestamp: Date.now(),
  };

  const t0 = performance.now();
  let firstTokenTime = 0;
  let tokenCount = 0;
  const texts: string[] = [];

  for await (const event of driver.receive(message)) {
    if (event.type === "text_delta") {
      if (!firstTokenTime) firstTokenTime = performance.now();
      tokenCount++;
      texts.push((event.data as { text: string }).text);
    }
  }

  const totalTime = performance.now() - t0;
  const ttft = firstTokenTime ? firstTokenTime - t0 : totalTime;

  return {
    ttft: Math.round(ttft),
    total: Math.round(totalTime),
    tokens: tokenCount,
    reply: texts.join("").slice(0, 80),
  };
}

describe("RoleX Performance with 'sean' role", () => {
  let contextSchema: string;
  let contextProjection: string;
  let contextTools: any[];

  test("Layer 1: RoleX context breakdown", async () => {
    const { localPlatform } = await import("@rolexjs/local-platform");
    const { RolexContextProvider } = await import("@rolexjs/agentx-context");
    const { createRoleX } = await import("rolexjs");

    const home = process.env.HOME || "~";
    const rolexPlatform = localPlatform({ dataDir: `${home}/.deepractice/rolex` });

    // First list all roles
    const rx = createRoleX({ platform: rolexPlatform });
    const t_survey = performance.now();
    const individuals = await rx.survey({ type: "individual", raw: true });
    const surveyTime = Math.round(performance.now() - t_survey);

    const roles = Array.isArray(individuals)
      ? individuals.filter((r: any) => r.id && r.id !== "undefined")
      : [];

    console.log(`\n=== Available Roles (${surveyTime}ms) ===`);
    for (const r of roles) {
      console.log(`  - ${(r as any).id} (${(r as any).alias?.join(", ") || "no alias"})`);
    }

    const roleId = "sean";
    console.log(`\nUsing role: ${roleId}`);

    // Measure context.create() (includes activate)
    const provider = new RolexContextProvider(rolexPlatform);
    const t0 = performance.now();
    const context = await provider.create(roleId);
    const createTime = Math.round(performance.now() - t0);

    // Measure schema
    const t1 = performance.now();
    contextSchema = context.schema;
    const schemaTime = Math.round(performance.now() - t1);

    // Measure project() x5
    const projectTimes: number[] = [];
    let projectionSize = 0;
    for (let i = 0; i < 5; i++) {
      const tp = performance.now();
      contextProjection = await context.project();
      projectTimes.push(Math.round(performance.now() - tp));
      projectionSize = contextProjection.length;
    }

    // Measure capabilities()
    const tc = performance.now();
    contextTools = context.capabilities().map((cap) => ({
      name: cap.name,
      description: cap.description,
      parameters: cap.parameters,
      execute: cap.execute,
    }));
    const capsTime = Math.round(performance.now() - tc);

    console.log(`\n=== Context Breakdown ===`);
    console.log(`  create(${roleId}):  ${createTime}ms`);
    console.log(`  schema:             ${schemaTime}ms (${contextSchema.length} chars)`);
    console.log(`  project() x5:       ${projectTimes.join(", ")}ms`);
    console.log(
      `  project() avg:      ${Math.round(projectTimes.reduce((a, b) => a + b) / projectTimes.length)}ms (${projectionSize} chars)`
    );
    console.log(
      `  capabilities():     ${capsTime}ms (${contextTools.length} tools: ${contextTools.map((t) => t.name).join(", ")})`
    );
    console.log(`  Total context size: ${contextSchema.length + projectionSize} chars`);

    expect(contextSchema.length).toBeGreaterThan(0);
  }, 30000);

  test("Layer 2: Model comparison — doubao-lite baseline vs +context", async () => {
    const model = "doubao-seed-2.0-lite";

    // Baseline
    const driverBase = createMonoDriver({
      apiKey,
      baseUrl,
      model,
      provider: "anthropic",
      instanceId: "perf",
    });
    await driverBase.initialize();
    const b1 = await measureReply(driverBase, question);
    const b2 = await measureReply(driverBase, question);
    const b3 = await measureReply(driverBase, question);
    await driverBase.dispose();

    // With context
    const systemPrompt = [
      contextSchema ? `<instructions>\n${contextSchema}\n</instructions>` : "",
      contextProjection ? `<context>\n${contextProjection}\n</context>` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const driverCtx = createMonoDriver({
      apiKey,
      baseUrl,
      model,
      provider: "anthropic",
      instanceId: "perf",
      systemPrompt: systemPrompt || undefined,
      tools: contextTools?.length > 0 ? contextTools : undefined,
    });
    await driverCtx.initialize();
    const c1 = await measureReply(driverCtx, question);
    const c2 = await measureReply(driverCtx, question);
    const c3 = await measureReply(driverCtx, question);
    await driverCtx.dispose();

    const avgBase = Math.round((b1.ttft + b2.ttft + b3.ttft) / 3);
    const avgCtx = Math.round((c1.ttft + c2.ttft + c3.ttft) / 3);

    console.log(`\n=== ${model}: Baseline vs +RoleX ===`);
    console.log(`  Baseline TTFT: ${b1.ttft}, ${b2.ttft}, ${b3.ttft}ms (avg ${avgBase}ms)`);
    console.log(`  +RoleX   TTFT: ${c1.ttft}, ${c2.ttft}, ${c3.ttft}ms (avg ${avgCtx}ms)`);
    console.log(
      `  Delta:         +${avgCtx - avgBase}ms (${Math.round(((avgCtx - avgBase) / avgBase) * 100)}%)`
    );

    expect(b1.tokens).toBeGreaterThan(0);
  }, 120000);

  test("Layer 3: Fast models comparison with context", async () => {
    const fastModels = ["doubao-seed-2.0-lite", "deepseek-v3.2", "doubao-seed-2.0-pro"];

    const systemPrompt = [
      contextSchema ? `<instructions>\n${contextSchema}\n</instructions>` : "",
      contextProjection ? `<context>\n${contextProjection}\n</context>` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    console.log(`\n=== Fast Models + RoleX Context ===`);

    for (const model of fastModels) {
      const driver = createMonoDriver({
        apiKey,
        baseUrl,
        model,
        provider: "anthropic",
        instanceId: "perf",
        systemPrompt: systemPrompt || undefined,
        tools: contextTools?.length > 0 ? contextTools : undefined,
      });
      await driver.initialize();

      const r1 = await measureReply(driver, question);
      const r2 = await measureReply(driver, question);
      const r3 = await measureReply(driver, question);

      const avg = Math.round((r1.ttft + r2.ttft + r3.ttft) / 3);
      console.log(`  [${model}] TTFT: ${r1.ttft}, ${r2.ttft}, ${r3.ttft}ms (avg ${avg}ms)`);

      await driver.dispose();
    }
  }, 120000);
});
