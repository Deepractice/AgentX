/**
 * Stop command - Stop a running agent
 */

import { Command } from "commander";
import {
  loadAgentConfig,
  loadAgentPid,
  removeAgentPid,
  removeAgentDir,
  isProcessRunning,
} from "../utils/paths";

interface StopOptions {
  remove?: boolean;
}

async function stopAction(nameOrId: string, options: StopOptions) {
  // Load agent config
  const config = await loadAgentConfig(nameOrId);
  if (!config) {
    console.error(`Error: Agent '${nameOrId}' not found`);
    process.exit(1);
  }

  // Load PID
  const pid = await loadAgentPid(nameOrId);
  if (!pid) {
    console.log(`Agent '${nameOrId}' is not running (no PID file)`);
    if (options.remove) {
      await removeAgentDir(nameOrId);
      console.log(`Removed agent directory for '${nameOrId}'`);
    }
    return;
  }

  // Check if process is running
  if (!isProcessRunning(pid)) {
    console.log(`Agent '${nameOrId}' is not running (PID ${pid} not found)`);
    await removeAgentPid(nameOrId);
    if (options.remove) {
      await removeAgentDir(nameOrId);
      console.log(`Removed agent directory for '${nameOrId}'`);
    }
    return;
  }

  // Send SIGTERM to stop gracefully
  console.log(`Stopping agent '${nameOrId}' (PID ${pid})...`);
  try {
    process.kill(pid, "SIGTERM");

    // Wait for process to exit (max 5 seconds)
    let attempts = 0;
    while (isProcessRunning(pid) && attempts < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (isProcessRunning(pid)) {
      // Force kill if still running
      console.log("Process did not exit gracefully, sending SIGKILL...");
      process.kill(pid, "SIGKILL");
    }

    await removeAgentPid(nameOrId);
    console.log(`Agent '${nameOrId}' stopped`);

    if (options.remove) {
      await removeAgentDir(nameOrId);
      console.log(`Removed agent directory for '${nameOrId}'`);
    }
  } catch (error) {
    console.error(`Error stopping agent: ${error}`);
    process.exit(1);
  }
}

export const stopCommand = new Command("stop")
  .description("Stop a running agent")
  .argument("<name|id>", "Agent name or ID")
  .option("--rm", "Remove agent directory after stopping")
  .action(stopAction);
