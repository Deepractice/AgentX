/**
 * Media Integration Test
 *
 * Tests file upload through MonoDriver with real LLM API.
 * Requires DEEPRACTICE_API_KEY and DEEPRACTICE_BASE_URL env vars.
 */

import { describe, expect, test } from "bun:test";
import type { UserContentPart } from "@agentxjs/core/agent";
import type { DriverStreamEvent } from "@agentxjs/core/driver";
import { UnsupportedMediaTypeError } from "@agentxjs/core/media";
import { createMonoDriver } from "../src/MonoDriver";

// Load env
const envPath = `${import.meta.dir}/../../../.env.local`;
const envFile = Bun.file(envPath);
if (await envFile.exists()) {
  for (const line of (await envFile.text()).split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const apiKey = process.env.DEEPRACTICE_API_KEY;
const baseUrl = process.env.DEEPRACTICE_BASE_URL;

const toBase64 = (s: string) => Buffer.from(s).toString("base64");

/** Collect all events from driver.receive() and return joined text */
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

describe("Media Integration", () => {
  test("markdown file → textExtract → LLM replies", async () => {
    if (!apiKey) return; // skip if no key

    const driver = createMonoDriver({
      apiKey: apiKey!,
      baseUrl,
      model: "claude-haiku-4-5-20251001",
      provider: "anthropic",
      instanceId: "test",
      systemPrompt: "Reply with one word only.",
    });
    await driver.initialize();

    const reply = await collectReply(driver, [
      {
        type: "file",
        data: toBase64("# Hello World\n\nThis is a test markdown file."),
        mediaType: "text/markdown",
        filename: "test.md",
      },
    ]);

    console.log("Markdown reply:", reply);
    expect(reply.length).toBeGreaterThan(0);
    await driver.dispose();
  }, 30000);

  test("JSON file → textExtract → LLM replies", async () => {
    if (!apiKey) return;

    const driver = createMonoDriver({
      apiKey: apiKey!,
      baseUrl,
      model: "claude-haiku-4-5-20251001",
      provider: "anthropic",
      instanceId: "test",
      systemPrompt: "Reply with one word only.",
    });
    await driver.initialize();

    const reply = await collectReply(driver, [
      {
        type: "file",
        data: toBase64('{"name": "agentx", "version": "2.8.0"}'),
        mediaType: "application/json",
        filename: "package.json",
      },
    ]);

    console.log("JSON reply:", reply);
    expect(reply.length).toBeGreaterThan(0);
    await driver.dispose();
  }, 30000);

  test("plain text file → passthrough → LLM replies", async () => {
    if (!apiKey) return;

    const driver = createMonoDriver({
      apiKey: apiKey!,
      baseUrl,
      model: "claude-haiku-4-5-20251001",
      provider: "anthropic",
      instanceId: "test",
      systemPrompt: "Reply with one word only.",
    });
    await driver.initialize();

    const reply = await collectReply(driver, [
      {
        type: "file",
        data: toBase64("This is a plain text readme file."),
        mediaType: "text/plain",
        filename: "readme.txt",
      },
    ]);

    console.log("Text reply:", reply);
    expect(reply.length).toBeGreaterThan(0);
    await driver.dispose();
  }, 30000);

  test("unsupported type → UnsupportedMediaTypeError", async () => {
    if (!apiKey) return;

    const driver = createMonoDriver({
      apiKey: apiKey!,
      baseUrl,
      model: "claude-haiku-4-5-20251001",
      provider: "anthropic",
      instanceId: "test",
    });
    await driver.initialize();

    try {
      await collectReply(driver, [
        {
          type: "file",
          data: toBase64("binary data"),
          mediaType: "application/octet-stream",
          filename: "data.bin",
        },
      ]);
      expect(true).toBe(false); // should not reach
    } catch (err) {
      expect(err).toBeInstanceOf(UnsupportedMediaTypeError);
      console.log("Unsupported error:", (err as Error).message);
    }
    await driver.dispose();
  }, 10000);

  test("mixed text + file content → LLM replies", async () => {
    if (!apiKey) return;

    const driver = createMonoDriver({
      apiKey: apiKey!,
      baseUrl,
      model: "claude-haiku-4-5-20251001",
      provider: "anthropic",
      instanceId: "test",
      systemPrompt: "Reply with one word only.",
    });
    await driver.initialize();

    const reply = await collectReply(driver, [
      { type: "text", text: "What is in this file?" },
      {
        type: "file",
        data: toBase64("name,age\nAlice,30\nBob,25"),
        mediaType: "text/csv",
        filename: "people.csv",
      },
    ]);

    console.log("Mixed reply:", reply);
    expect(reply.length).toBeGreaterThan(0);
    await driver.dispose();
  }, 30000);
});
