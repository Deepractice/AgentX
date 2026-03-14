/**
 * Debug AgentX server — runs with latest source code.
 * Frontend can connect to ws://localhost:5200 to test file upload.
 */

import { createMonoDriver } from "@agentxjs/mono-driver";
import { nodePlatform } from "@agentxjs/node-platform";
import { createAgentX } from "agentxjs";

const home = process.env.HOME || process.env.USERPROFILE || "~";

const createDriver = (config: Parameters<typeof createMonoDriver>[0]) => createMonoDriver(config);

const platform = nodePlatform({
  dataPath: `${home}/.deepractice/agentx`,
});

const ax = createAgentX({ platform: await platform.resolve(), createDriver });
const port = 5200;
const server = await ax.serve({ port });
await server.listen();

console.log("\n========================================");
console.log(`  Debug AgentX server running`);
console.log(`  WebSocket: ws://localhost:${port}`);
console.log("  Using latest mono-driver with MediaResolver");
console.log("========================================\n");
