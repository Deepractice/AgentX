import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SKILL_PATH = resolve(__dirname, "../../../../.claude/skills/agent-browser/SKILL.md");

function loadSystemPrompt(headed = false): string {
  let skillContent = "";
  try {
    skillContent = readFileSync(SKILL_PATH, "utf-8");
  } catch {
    // Skill file not found, continue without it
  }

  return `You are a UI tester. You test web application scenarios using the agent-browser CLI.

RULES:
- ONLY use agent-browser commands via Bash tool
- Use ${headed ? "--headed " : ""}--executable-path "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" for all commands
- After each navigation or click, run: agent-browser snapshot -i
- Refs (@e1, @e2) are invalidated after page changes — always re-snapshot
- At the end, close the browser with: agent-browser close
- Output your result as a single line: PASS or FAIL followed by a brief reason

${skillContent ? `AGENT-BROWSER REFERENCE:\n${skillContent}` : ""}`;
}

export interface UiTestResult {
  passed: boolean;
  output: string;
}

export interface UiTesterOptions {
  model?: string;
  baseUrl?: string;
  timeout?: number;
  /** Show browser window (default: false) */
  headed?: boolean;
}

/**
 * Run a UI test scenario using Claude Code CLI + agent-browser.
 *
 * BDD scripts must run under Node.js (not Bun) to avoid claude CLI auth bug.
 */
export function agentUiTester(prompt: string, options: UiTesterOptions = {}): UiTestResult {
  const { model = "haiku", baseUrl, timeout = 300_000, headed = false } = options;

  const fullPrompt = baseUrl ? `Base URL: ${baseUrl}\n\n${prompt}` : prompt;

  const systemPrompt = loadSystemPrompt(headed);

  // Filter out CLAUDE* env vars to avoid auth conflicts when spawned from Claude Code
  const cleanEnv = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith("CLAUDE"))
  );

  try {
    const output = execFileSync(
      "claude",
      [
        "-p",
        fullPrompt,
        "--model",
        model,
        "--append-system-prompt",
        systemPrompt,
        "--allowedTools",
        "Bash(agent-browser:*)",
      ],
      {
        encoding: "utf-8",
        timeout,
        env: cleanEnv,
        maxBuffer: 10 * 1024 * 1024,
      }
    ).trim();

    const passed = /\*{0,2}PASS\*{0,2}\b/m.test(output);
    return { passed, output };
  } catch (error: any) {
    const output = error.stdout || error.stderr || error.message || "Unknown error";
    return { passed: false, output: output.trim() };
  }
}
