#!/usr/bin/env bun

/**
 * Record Fixture Script
 *
 * Records a real Claude conversation and saves it as a fixture.
 * Environment is auto-loaded from monorepo root .env.local via bunfig.toml preload.
 *
 * Usage:
 *   bun run scripts/record-fixture.ts "Hello, how are you?" my-greeting
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClaudeDriverFactory } from "@agentxjs/claude-driver";
import { EventBusImpl } from "@agentxjs/core/event";
import { createRecordingDriver } from "../src/recorder/RecordingDriver";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse args
const message = process.argv[2] || "Hello!";
const fixtureName = process.argv[3] || `fixture-${Date.now()}`;

// Get config from env
const apiKey = process.env.DEEPRACTICE_API_KEY;
const baseUrl = process.env.DEEPRACTICE_BASE_URL;
const model = process.env.DEEPRACTICE_MODEL || "claude-haiku-4-5-20251001";

if (!apiKey) {
  console.error("Error: DEEPRACTICE_API_KEY is required");
  process.exit(1);
}

console.log(`\n🎬 Recording fixture: ${fixtureName}`);
console.log(`📝 Message: "${message}"`);
console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...`);
if (baseUrl) console.log(`🌐 Base URL: ${baseUrl}`);

async function main() {
  // Create EventBus
  const bus = new EventBusImpl();

  // Create real Claude driver
  const claudeFactory = createClaudeDriverFactory();
  const realDriver = claudeFactory.createDriver({
    agentId: "recording-agent",
    config: {
      apiKey: apiKey!,
      baseUrl,
      model,
      systemPrompt: "You are a helpful assistant. Keep responses brief.",
      cwd: process.cwd(), // Enable Bash tool execution
    },
  });

  // Wrap with recorder
  const recorder = createRecordingDriver({
    driver: realDriver,
    name: fixtureName,
    description: `Recording of: "${message}"`,
  });

  // Connect
  recorder.connect(bus.asConsumer(), bus.asProducer());

  // Track when we get message_stop with end_turn (not tool_use)
  let completed = false;
  bus.on("message_stop", (evt) => {
    const data = evt.data as { stopReason?: string };
    // Only finish when it's truly done, not when waiting for tool result
    if (data.stopReason === "end_turn") {
      completed = true;
    }
  });

  // Track text deltas
  let fullText = "";
  bus.on("text_delta", (evt) => {
    const text = (evt.data as { text: string }).text;
    fullText += text;
    process.stdout.write(text);
  });

  // Track tool calls
  bus.on("tool_use_content_block_start", (evt) => {
    const data = evt.data as { name?: string };
    console.log(`\n🔧 Tool call: ${data.name || "unknown"}`);
  });

  bus.on("tool_result", (evt) => {
    const data = evt.data as { isError?: boolean };
    console.log(`📤 Tool result ${data.isError ? "(error)" : "(success)"}`);
  });

  console.log("\n\n📤 Sending message...\n");
  console.log("------- Response -------");

  // Send user message
  bus.emit({
    type: "user_message",
    timestamp: Date.now(),
    source: "test",
    category: "message",
    intent: "request",
    data: {
      id: `msg_${Date.now()}`,
      role: "user",
      subtype: "user",
      content: message,
      timestamp: Date.now(),
    },
    context: {
      agentId: "recording-agent",
      sessionId: "recording-session",
    },
  } as never);

  // Wait for completion (longer timeout for tool calls)
  const timeout = 120000; // 2 minutes
  const start = Date.now();
  while (!completed && Date.now() - start < timeout) {
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log("\n------------------------\n");

  if (!completed) {
    console.error("⚠️  Timeout waiting for response");
  }

  // Save fixture
  const outputPath = join(__dirname, "..", "fixtures", `${fixtureName}.json`);
  await recorder.saveFixture(outputPath);

  console.log(`✅ Fixture saved: ${outputPath}`);
  console.log(`📊 Events recorded: ${recorder.eventCount}`);
  console.log(`📝 Response length: ${fullText.length} chars`);

  // Cleanup
  recorder.dispose();

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
