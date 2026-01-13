#!/usr/bin/env bun
/**
 * Debug MockEnvironment
 */

async function test() {
  console.log("1. Creating AgentX with MockEnvironment...");
  const { createAgentX } = await import("agentxjs");
  const { MockEnvironmentFactory } = await import("./mock");

  const mockFactory = new MockEnvironmentFactory();
  mockFactory.setScenario("instant");

  const agentx = await createAgentX({
    environmentFactory: mockFactory,
  });

  console.log("2. Creating container and image...");
  await agentx.request("container_create_request", { containerId: "test" });
  const imageResp = await agentx.request("image_create_request", {
    containerId: "test",
    config: { name: "Test" },
  });
  const imageId = (imageResp.data as any).record.imageId;

  console.log("3. Subscribing to events...");
  const events: any[] = [];
  agentx.on("text_delta", (e) => {
    console.log(">>> text_delta:", e.data);
    events.push(e);
  });

  agentx.on("message_start", (e) => console.log(">>> message_start"));
  agentx.on("message_stop", (e) => console.log(">>> message_stop"));

  console.log("4. Sending message...");
  await agentx.request("message_send_request", {
    imageId,
    content: "Test",
  });

  console.log("5. Waiting for events...");
  await new Promise((r) => setTimeout(r, 500));

  console.log(`6. Received ${events.length} text_delta events`);
  const fullText = events.map((e) => e.data.text).join("");
  console.log(`   Full text: "${fullText}"`);

  await agentx.dispose();
  console.log("7. Done");
}

test().catch((err) => console.error("Error:", err));
