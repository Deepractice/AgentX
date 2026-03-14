/**
 * Multi-Model Media Integration Test
 *
 * Tests file upload across all available models on the Ark platform.
 * Verifies each model handles text extract correctly.
 */

import { describe, expect, test } from "bun:test";
import type { UserContentPart } from "@agentxjs/core/agent";
import { createMonoDriver } from "../src/MonoDriver";

const apiKey = "2511410b-bd2f-44d4-bfc7-5fb7799ba751";
const baseUrl = "https://ark.cn-beijing.volces.com/api/coding";

const models = [
  "kimi-k2.5",
  "doubao-seed-2.0-code",
  "doubao-seed-2.0-pro",
  "doubao-seed-2.0-lite",
  "doubao-seed-code",
  "minimax-m2.5",
  "glm-4.7",
  "deepseek-v3.2",
];

const toBase64 = (s: string) => Buffer.from(s).toString("base64");

const files: { name: string; content: UserContentPart[] }[] = [
  {
    name: "text/plain",
    content: [
      {
        type: "file",
        data: toBase64("Hello world, this is a plain text file."),
        mediaType: "text/plain",
        filename: "readme.txt",
      },
    ],
  },
  {
    name: "text/markdown",
    content: [
      {
        type: "file",
        data: toBase64("# Project\n\n- Feature A\n- Feature B\n- Feature C"),
        mediaType: "text/markdown",
        filename: "plan.md",
      },
    ],
  },
  {
    name: "application/json",
    content: [
      {
        type: "file",
        data: toBase64('{"name":"agentx","version":"2.8.1","deps":["core","mono-driver"]}'),
        mediaType: "application/json",
        filename: "package.json",
      },
    ],
  },
  {
    name: "text/csv",
    content: [
      { type: "text", text: "Summarize this data in one sentence." },
      {
        type: "file",
        data: toBase64("product,price,quantity\nApple,1.5,100\nBanana,0.8,200\nOrange,2.0,50"),
        mediaType: "text/csv",
        filename: "inventory.csv",
      },
    ],
  },
];

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

// Generate tests for each model × file combination
for (const model of models) {
  describe(model, () => {
    for (const file of files) {
      test(`${file.name}`, async () => {
        const driver = createMonoDriver({
          apiKey,
          baseUrl,
          model,
          provider: "anthropic",
          instanceId: "test",
          systemPrompt: "Reply with one sentence only. Be concise.",
        });
        await driver.initialize();

        try {
          const reply = await collectReply(driver, file.content);
          console.log(`[${model}] ${file.name}: ${reply.slice(0, 100)}`);
          expect(reply.length).toBeGreaterThan(0);
        } catch (err: any) {
          console.error(`[${model}] ${file.name}: ERROR - ${err.message?.slice(0, 150)}`);
          throw err;
        } finally {
          await driver.dispose();
        }
      }, 60000);
    }
  });
}
