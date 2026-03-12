#!/usr/bin/env bun

/**
 * Record RoleX Integration Fixture
 *
 * Records a real MonoDriver + RoleX conversation and saves as fixture.
 * Uses env from devtools (DEEPRACTICE_API_KEY, DEEPRACTICE_BASE_URL, DEEPRACTICE_MODEL).
 *
 * Usage:
 *   bun run scripts/record-rolex.ts
 *   bun run scripts/record-rolex.ts "你的目标是什么" rolex-goals
 *   bun run scripts/record-rolex.ts "你好，你是谁" rolex-hello kant
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { UserMessage } from "@agentxjs/core/agent";
import { env } from "@agentxjs/devtools";
import { RecordingDriver } from "@agentxjs/devtools/recorder";
import { localPlatform } from "@rolexjs/local-platform";
import { createMonoDriver } from "../src";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse args
const message = process.argv[2] || "你好，请介绍一下你自己，你的职责是什么";
const fixtureName = process.argv[3] || "rolex-integration";
const roleId = process.argv[4] || "nuwa";

// Validate env
if (!env.apiKey) {
  console.error("Error: DEEPRACTICE_API_KEY is required");
  process.exit(1);
}

console.log(`\n🎬 Recording RoleX fixture: ${fixtureName}`);
console.log(`📝 Message: "${message}"`);
console.log(`👤 Role ID: ${roleId}`);
console.log(`🔑 API Key: ${env.apiKey.substring(0, 10)}...`);
if (env.baseUrl) console.log(`🌐 Base URL: ${env.baseUrl}`);
console.log(`🤖 Model: ${env.model}`);

async function main() {
  // Create RoleX local platform (uses ~/.deepractice/rolex by default)
  const rolexPlatformInstance = localPlatform();

  // Create MonoDriver with RoleX integration
  const realDriver = createMonoDriver({
    apiKey: env.apiKey!,
    baseUrl: env.baseUrl,
    model: env.model,
    agentId: "rolex-recording-agent",
    provider: "anthropic",
    systemPrompt: "You are an AI assistant with RoleX role system enabled. Respond concisely.",
    rolex: {
      platform: rolexPlatformInstance,
      roleId,
    },
  });

  // Wrap with RecordingDriver
  const recorder = new RecordingDriver({
    driver: realDriver,
    name: fixtureName,
    description: `RoleX integration recording — role: ${roleId}, message: "${message}"`,
  });

  await recorder.initialize();

  console.log("\n📤 Sending message...\n");
  console.log("------- Response -------");

  const userMessage: UserMessage = {
    id: `msg_${Date.now()}`,
    role: "user",
    subtype: "user",
    content: message,
    timestamp: Date.now(),
  };

  let fullText = "";
  let toolCalls = 0;

  try {
    for await (const event of recorder.receive(userMessage)) {
      switch (event.type) {
        case "text_delta":
          fullText += (event.data as { text: string }).text;
          process.stdout.write((event.data as { text: string }).text);
          break;
        case "tool_use_start":
          toolCalls++;
          console.log(`\n🔧 Tool call: ${(event.data as { toolName: string }).toolName}`);
          break;
        case "tool_result":
          console.log(
            `📤 Tool result ${(event.data as { isError?: boolean }).isError ? "(error)" : "(success)"}`
          );
          break;
        case "error":
          console.log(`\n❌ Error: ${(event.data as { message: string }).message}`);
          break;
      }
    }
  } catch (err) {
    console.error("\n[Driver Error]", err);
  }

  console.log("\n------------------------\n");

  // Save fixture
  const outputPath = join(__dirname, "..", "fixtures", `${fixtureName}.json`);
  await recorder.saveFixture(outputPath);

  console.log(`✅ Fixture saved: ${outputPath}`);
  console.log(`📊 Events recorded: ${recorder.eventCount}`);
  console.log(`📝 Response length: ${fullText.length} chars`);
  console.log(`🔧 Tool calls: ${toolCalls}`);

  await recorder.dispose();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
