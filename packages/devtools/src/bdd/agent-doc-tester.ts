import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const SYSTEM_PROMPT = `You are a documentation reviewer. You evaluate whether a document meets specific requirements.

RULES:
- Read the provided document carefully
- Evaluate each requirement listed in the prompt
- Be strict but fair — the document should genuinely help the reader achieve the stated goal
- Output your result as a single line: PASS or FAIL followed by a brief reason
- If FAIL, list which specific requirements are not met`;

export interface DocTestResult {
  passed: boolean;
  output: string;
}

export interface DocTesterOptions {
  model?: string;
  timeout?: number;
}

/**
 * Evaluate a document against requirements using Claude CLI.
 *
 * @example
 * ```ts
 * const result = agentDocTester({
 *   files: ["packages/core/README.md"],
 *   requirements: `
 *     The README should explain Container, Image, Session, Driver, Platform.
 *     A contributor should understand these concepts without opening .ts files.
 *     There should be a Quick Start example.
 *   `,
 * });
 * expect(result.passed).toBe(true);
 * ```
 */
export function agentDocTester(
  options: {
    files: string[];
    requirements: string;
  },
  testerOptions: DocTesterOptions = {}
): DocTestResult {
  const { model = "haiku", timeout = 120_000 } = testerOptions;

  // Read all document files
  const docContents = options.files.map((filePath) => {
    if (!existsSync(filePath)) {
      return `--- ${filePath} ---\n[FILE NOT FOUND]`;
    }
    const content = readFileSync(filePath, "utf-8");
    return `--- ${filePath} ---\n${content}`;
  }).join("\n\n");

  const fullPrompt = [
    "Evaluate the following document(s) against the requirements below.",
    "",
    "DOCUMENTS:",
    docContents,
    "",
    "REQUIREMENTS:",
    options.requirements,
    "",
    "Evaluate each requirement. Output PASS if all are met, FAIL if any are not.",
  ].join("\n");

  const tmpDir = join(tmpdir(), "agent-doc-tester");
  mkdirSync(tmpDir, { recursive: true });
  const promptFile = join(tmpDir, `prompt-${Date.now()}.txt`);
  const sysPromptFile = join(tmpDir, `sys-${Date.now()}.txt`);
  const scriptFile = join(tmpDir, `run-${Date.now()}.sh`);

  writeFileSync(promptFile, fullPrompt);
  writeFileSync(sysPromptFile, SYSTEM_PROMPT);
  writeFileSync(
    scriptFile,
    [
      "#!/bin/bash",
      "unset CLAUDECODE CLAUDE_CODE_SSE_PORT CLAUDE_CODE_ENTRYPOINT",
      `PROMPT=$(cat "${promptFile}")`,
      `SYS_PROMPT=$(cat "${sysPromptFile}")`,
      `claude -p "$PROMPT" --model ${model} --append-system-prompt "$SYS_PROMPT"`,
    ].join("\n")
  );

  try {
    const result = spawnSync("/bin/bash", [scriptFile], {
      encoding: "utf-8",
      timeout,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const output = (result.stdout || result.stderr || "").trim();
    const passed = /\*{0,2}PASS\*{0,2}\b/m.test(output);

    return { passed, output };
  } catch (error: any) {
    return { passed: false, output: error.message || "Unknown error" };
  } finally {
    try { unlinkSync(promptFile); } catch {}
    try { unlinkSync(sysPromptFile); } catch {}
    try { unlinkSync(scriptFile); } catch {}
  }
}
