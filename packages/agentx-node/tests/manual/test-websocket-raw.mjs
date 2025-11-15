/**
 * Manual Test: Raw WebSocket Server Connection
 *
 * Tests the WebSocket server using native WebSocket client (ws package).
 */

import WebSocket from "ws";

console.log("🧪 WebSocket Server Raw Test\n");
console.log("📡 Connecting to ws://localhost:5200/ws\n");

const ws = new WebSocket("ws://localhost:5200/ws");

let receivedMessages = [];

ws.on("open", () => {
  console.log("✅ WebSocket connected!\n");

  // Send a test message (correct format: type="send")
  const testMessage = {
    type: "send",
    content: "Hello! Please respond with a short greeting.",
  };

  console.log("📤 Sending message:", JSON.stringify(testMessage, null, 2));
  ws.send(JSON.stringify(testMessage));
});

ws.on("message", (data) => {
  try {
    const message = JSON.parse(data.toString());
    receivedMessages.push(message);

    console.log("\n📨 Received:", message.type || "unknown");

    if (message.type === "stream_event") {
      if (message.delta?.type === "text_delta") {
        process.stdout.write(message.delta.text);
      }
    } else if (message.type === "assistant") {
      console.log("\n✅ Assistant message complete");
      console.log(`   Content: ${message.message?.content?.substring(0, 100)}...`);
    } else if (message.type === "result") {
      console.log("\n📊 Result:");
      console.log(`   Subtype: ${message.subtype}`);
      console.log(`   Cost: $${message.totalCostUsd?.toFixed(4) || "N/A"}`);

      // Test complete
      setTimeout(() => {
        console.log("\n\n✅ Test Complete!");
        console.log(`\n📋 Total messages received: ${receivedMessages.length}`);

        const typeCounts = receivedMessages.reduce((acc, msg) => {
          const type = msg.type || "unknown";
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});

        console.log("\n📊 Message types:");
        console.log(JSON.stringify(typeCounts, null, 2));

        ws.close();
      }, 1000);
    } else {
      console.log("   Data:", JSON.stringify(message, null, 2).substring(0, 200));
    }
  } catch (error) {
    console.error("❌ Failed to parse message:", error);
    console.log("Raw data:", data.toString());
  }
});

ws.on("error", (error) => {
  console.error("\n❌ WebSocket error:", error);
  process.exit(1);
});

ws.on("close", () => {
  console.log("\n🔌 WebSocket closed");
  process.exit(0);
});

// Timeout
setTimeout(() => {
  console.log("\n⏱️  Test timeout");
  ws.close();
  process.exit(1);
}, 30000);
