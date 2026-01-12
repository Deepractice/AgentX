#!/usr/bin/env bun
/**
 * Debug remote client request
 */

async function test() {
  console.log("1. Creating remote client...");
  const { createAgentX } = await import("agentxjs");

  const client = await createAgentX({ serverUrl: "ws://localhost:15300" });
  console.log("2. Client created (global subscription confirmed)");

  // Add event listener to see what we receive
  let eventCount = 0;
  client.on("container_create_response", (event) => {
    console.log(`>>> Received container_create_response #${++eventCount}`);
    console.log("    category:", event.category);
    console.log("    requestId:", (event.data as any)?.requestId);
    console.log("    data:", event.data);
  });

  console.log("3. Sending container_create_request...");
  const response = await client.request("container_create_request", {
    containerId: "debug-test",
  });

  console.log("4. Response received:", response);

  await client.dispose();
  console.log("5. Done");
}

test().catch((err) => console.error("Error:", err));
