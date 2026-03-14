/**
 * Quick test: PDF support per model
 */

import { UnsupportedMediaTypeError } from "@agentxjs/core/media";
import { createMonoDriver } from "../src/MonoDriver";

const apiKey = "2511410b-bd2f-44d4-bfc7-5fb7799ba751";
const baseUrl = "https://ark.cn-beijing.volces.com/api/coding";
const toBase64 = (s: string) => Buffer.from(s).toString("base64");

const models = ["kimi-k2.5", "doubao-seed-2.0-pro", "claude-sonnet-4-20250514"];

for (const model of models) {
  const driver = createMonoDriver({
    apiKey,
    baseUrl,
    model,
    provider: "anthropic",
    instanceId: "test",
    systemPrompt: "Reply briefly.",
  });
  await driver.initialize();

  try {
    const msg = {
      id: "msg_1",
      role: "user" as const,
      subtype: "user" as const,
      content: [
        {
          type: "file" as const,
          data: toBase64("fake pdf"),
          mediaType: "application/pdf",
          filename: "test.pdf",
        },
      ],
      timestamp: Date.now(),
    };
    for await (const event of driver.receive(msg)) {
      if (event.type === "text_delta") process.stdout.write((event.data as any).text);
    }
    console.log(`\n[${model}] PDF: PASS (passthrough)`);
  } catch (err: any) {
    if (err instanceof UnsupportedMediaTypeError) {
      console.log(`[${model}] PDF: BLOCKED (UnsupportedMediaTypeError) ✓`);
    } else {
      console.log(`[${model}] PDF: ERROR - ${err.message?.slice(0, 80)}`);
    }
  }
  await driver.dispose();
}
