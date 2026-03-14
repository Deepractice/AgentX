/**
 * Media Integration Test — Kimi K2.5 via Anthropic protocol
 */

import { describe, expect, test } from "bun:test";
import type { UserContentPart } from "@agentxjs/core/agent";
import { UnsupportedMediaTypeError } from "@agentxjs/core/media";
import { createMonoDriver } from "../src/MonoDriver";

const apiKey = "2511410b-bd2f-44d4-bfc7-5fb7799ba751";
const baseUrl = "https://ark.cn-beijing.volces.com/api/coding";
const model = "kimi-k2.5";

const toBase64 = (s: string) => Buffer.from(s).toString("base64");

function makeDriver() {
  return createMonoDriver({
    apiKey,
    baseUrl,
    model,
    provider: "anthropic",
    instanceId: "test",
    systemPrompt: "Reply with one sentence only.",
  });
}

async function collectReply(
  driver: ReturnType<typeof createMonoDriver>,
  content: string | UserContentPart[]
) {
  const message = {
    id: `msg_${Date.now()}`,
    role: "user" as const,
    subtype: "user" as const,
    content,
    timestamp: Date.now(),
  };
  const texts: string[] = [];
  for await (const event of driver.receive(message)) {
    if (event.type === "text_delta") {
      texts.push((event.data as { text: string }).text);
    }
  }
  return texts.join("");
}

describe("Kimi K2.5 Media Integration", () => {
  test("baseline: plain text message works", async () => {
    const driver = makeDriver();
    await driver.initialize();
    const reply = await collectReply(driver, "Hello, reply with one word.");
    console.log("Baseline reply:", reply);
    expect(reply.length).toBeGreaterThan(0);
    await driver.dispose();
  }, 30000);

  test("text/plain file (passthrough)", async () => {
    const driver = makeDriver();
    await driver.initialize();
    const reply = await collectReply(driver, [
      {
        type: "file",
        data: toBase64("Hello world, this is a test file."),
        mediaType: "text/plain",
        filename: "test.txt",
      },
    ]);
    console.log("text/plain reply:", reply);
    expect(reply.length).toBeGreaterThan(0);
    await driver.dispose();
  }, 30000);

  test("text/markdown file (textExtract)", async () => {
    const driver = makeDriver();
    await driver.initialize();
    const reply = await collectReply(driver, [
      {
        type: "file",
        data: toBase64("# Hello\n\n- item 1\n- item 2"),
        mediaType: "text/markdown",
        filename: "readme.md",
      },
    ]);
    console.log("markdown reply:", reply);
    expect(reply.length).toBeGreaterThan(0);
    await driver.dispose();
  }, 30000);

  test("application/json file (textExtract)", async () => {
    const driver = makeDriver();
    await driver.initialize();
    const reply = await collectReply(driver, [
      {
        type: "file",
        data: toBase64('{"name":"test","version":"1.0"}'),
        mediaType: "application/json",
        filename: "config.json",
      },
    ]);
    console.log("json reply:", reply);
    expect(reply.length).toBeGreaterThan(0);
    await driver.dispose();
  }, 30000);

  test("mixed text + csv file", async () => {
    const driver = makeDriver();
    await driver.initialize();
    const reply = await collectReply(driver, [
      { type: "text", text: "What data is in this file?" },
      {
        type: "file",
        data: toBase64("name,age\nAlice,30\nBob,25"),
        mediaType: "text/csv",
        filename: "data.csv",
      },
    ]);
    console.log("mixed reply:", reply);
    expect(reply.length).toBeGreaterThan(0);
    await driver.dispose();
  }, 30000);

  test("unsupported type throws error", async () => {
    const driver = makeDriver();
    await driver.initialize();
    try {
      await collectReply(driver, [
        {
          type: "file",
          data: toBase64("binary"),
          mediaType: "application/octet-stream",
          filename: "data.bin",
        },
      ]);
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(UnsupportedMediaTypeError);
      console.log("Unsupported error:", (err as Error).message);
    }
    await driver.dispose();
  }, 10000);
});
