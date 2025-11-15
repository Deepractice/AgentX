/**
 * Manual Test: WebSocket Server Connection
 *
 * This script tests the WebSocket server running on ws://localhost:5200/ws
 * using the agentx-browser client in Node.js environment.
 */

import { createAgent } from "@deepractice-ai/agentx-browser";

console.log("🧪 WebSocket Server Test\n");
console.log("📡 Connecting to ws://localhost:5200/ws\n");

// Create agent with browser provider (WebSocket client)
const agent = createAgent(
  {
    wsUrl: "ws://localhost:5200/ws",
    sessionId: `test-${Date.now()}`,
  },
  {
    enableLogging: true,
    loggerTag: "WSTest",
    logLevel: "debug",
  }
);

// Track events
let receivedEvents = [];

// Listen to all events
agent.on("system_init", (event) => {
  console.log("\n✅ System initialized");
  receivedEvents.push("system_init");
});

agent.on("user", (event) => {
  console.log("\n📤 User message sent");
  receivedEvents.push("user");
});

agent.on("stream_event", (event) => {
  if (event.delta?.type === "text_delta") {
    process.stdout.write(event.delta.text);
  }
  receivedEvents.push("stream_event");
});

agent.on("assistant", (event) => {
  console.log("\n\n✅ Assistant message complete");
  console.log(`   Content: ${event.message.content.substring(0, 100)}...`);
  receivedEvents.push("assistant");
});

agent.on("result", (event) => {
  console.log("\n📊 Result event:");
  console.log(`   Subtype: ${event.subtype}`);
  console.log(`   Cost: $${event.totalCostUsd?.toFixed(4) || "N/A"}`);
  console.log(`   Tokens: ${JSON.stringify(event.usage)}`);
  receivedEvents.push("result");
});

// Test flow
async function runTest() {
  try {
    console.log("📝 Sending test message...\n");

    await agent.send("Hello! Please respond with a short greeting.");

    // Wait a bit for all events
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("\n\n✅ Test Complete!");
    console.log("\n📋 Events Received:");
    const eventCounts = receivedEvents.reduce((acc, event) => {
      acc[event] = (acc[event] || 0) + 1;
      return acc;
    }, {});
    console.log(JSON.stringify(eventCounts, null, 2));

    // Cleanup
    agent.destroy();
    console.log("\n🧹 Cleaned up agent");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test Failed:", error);
    agent.destroy();
    process.exit(1);
  }
}

// Start test
runTest();
