/**
 * Path utilities for AgentX CLI
 *
 * Directory structure:
 * ~/.agentx/
 * ├── agents/
 * │   └── [name]/
 * │       ├── config.json    # agent configuration
 * │       ├── agent.pid      # PID file
 * │       └── agent.log      # logs
 * └── config.json            # global config (optional)
 */

import { homedir } from "os";
import { join } from "path";
import { mkdir, readdir, readFile, writeFile, rm, stat } from "fs/promises";

// Base directory
export const AGENTX_HOME = join(homedir(), ".agentx");
export const AGENTS_DIR = join(AGENTX_HOME, "agents");

/**
 * Get agent directory path
 */
export function getAgentDir(name: string): string {
  return join(AGENTS_DIR, name);
}

/**
 * Get agent config file path
 */
export function getAgentConfigPath(name: string): string {
  return join(getAgentDir(name), "config.json");
}

/**
 * Get agent PID file path
 */
export function getAgentPidPath(name: string): string {
  return join(getAgentDir(name), "agent.pid");
}

/**
 * Get agent log file path
 */
export function getAgentLogPath(name: string): string {
  return join(getAgentDir(name), "agent.log");
}

/**
 * Agent configuration stored in config.json
 */
export interface AgentConfig {
  name: string;
  port: number;
  host: string;
  workDir: string;
  model: string;
  envFile?: string;
  createdAt: number;
  pid?: number;
}

/**
 * Ensure agentx directories exist
 */
export async function ensureAgentxDirs(): Promise<void> {
  await mkdir(AGENTS_DIR, { recursive: true });
}

/**
 * Ensure agent directory exists
 */
export async function ensureAgentDir(name: string): Promise<void> {
  await mkdir(getAgentDir(name), { recursive: true });
}

/**
 * Save agent configuration
 */
export async function saveAgentConfig(config: AgentConfig): Promise<void> {
  await ensureAgentDir(config.name);
  await writeFile(getAgentConfigPath(config.name), JSON.stringify(config, null, 2));
}

/**
 * Load agent configuration
 */
export async function loadAgentConfig(name: string): Promise<AgentConfig | null> {
  try {
    const content = await readFile(getAgentConfigPath(name), "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Save agent PID
 */
export async function saveAgentPid(name: string, pid: number): Promise<void> {
  await writeFile(getAgentPidPath(name), String(pid));
}

/**
 * Load agent PID
 */
export async function loadAgentPid(name: string): Promise<number | null> {
  try {
    const content = await readFile(getAgentPidPath(name), "utf-8");
    return parseInt(content.trim(), 10);
  } catch {
    return null;
  }
}

/**
 * Remove agent PID file
 */
export async function removeAgentPid(name: string): Promise<void> {
  try {
    await rm(getAgentPidPath(name));
  } catch {
    // Ignore if file doesn't exist
  }
}

/**
 * Remove agent directory
 */
export async function removeAgentDir(name: string): Promise<void> {
  try {
    await rm(getAgentDir(name), { recursive: true });
  } catch {
    // Ignore if directory doesn't exist
  }
}

/**
 * List all agents
 */
export async function listAgents(): Promise<AgentConfig[]> {
  try {
    await ensureAgentxDirs();
    const dirs = await readdir(AGENTS_DIR);
    const agents: AgentConfig[] = [];

    for (const dir of dirs) {
      const config = await loadAgentConfig(dir);
      if (config) {
        agents.push(config);
      }
    }

    return agents;
  } catch {
    return [];
  }
}

/**
 * Check if a process is running
 */
export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get agent status
 */
export async function getAgentStatus(name: string): Promise<"running" | "stopped" | "unknown"> {
  const pid = await loadAgentPid(name);
  if (!pid) {
    return "stopped";
  }
  return isProcessRunning(pid) ? "running" : "stopped";
}
