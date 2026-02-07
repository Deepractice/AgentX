import { readFileSync, existsSync } from "node:fs";
import { env } from "../env";

const SYSTEM_PROMPT = `You are a documentation reviewer evaluating documents from the reader's experience.

EVALUATION DIMENSIONS:
1. Completeness — All required information is present. Nothing critical is missing.
2. Logic — Structure flows naturally. Concepts build on each other without jumps.
3. Readability — A newcomer can follow without confusion. No unexplained jargon.

RULES:
- Read the provided document carefully
- Evaluate each requirement listed in the prompt against ALL three dimensions
- Be strict but fair — the document should genuinely help the reader achieve the stated goal
- Output your result as a single line: PASS or FAIL followed by a brief reason
- If FAIL, list which specific requirements are not met and which dimension they violate`;

export interface DocTestResult {
  passed: boolean;
  output: string;
}

export interface DocTesterOptions {
  /** LLM provider (default: "anthropic") */
  provider?: string;
  /** Model name */
  model?: string;
  /** API key (reads from env if not provided) */
  apiKey?: string;
  /** Base URL (reads from env if not provided) */
  baseUrl?: string;
  /** Timeout in ms */
  timeout?: number;
}

/**
 * Evaluate a document against requirements using AgentX.
 *
 * Uses agentxjs local mode — no subprocess, no CLI, no auth issues.
 * Requires `agentxjs` as a peer dependency.
 */
export async function agentDocTester(
  options: {
    files: string[];
    requirements: string;
  },
  testerOptions: DocTesterOptions = {}
): Promise<DocTestResult> {
  const {
    provider = process.env.AGENTX_PROVIDER || "anthropic",
    model = env.model,
    apiKey = env.apiKey || "",
    baseUrl = env.baseUrl,
    timeout = 120_000,
  } = testerOptions;

  const docContents = options.files
    .map((filePath) => {
      if (!existsSync(filePath)) {
        return `--- ${filePath} ---\n[FILE NOT FOUND]`;
      }
      return `--- ${filePath} ---\n${readFileSync(filePath, "utf-8")}`;
    })
    .join("\n\n");

  const userPrompt = [
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

  // Dynamic import to avoid circular dependency (devtools ↔ agentxjs)
  // Use variable to prevent TypeScript DTS from resolving the module
  const moduleName = "agentxjs";
  const agentxjs: any = await import(/* @vite-ignore */ moduleName);
  const createAgentX: (...args: any[]) => Promise<any> = agentxjs.createAgentX;

  let agentx: any = null;

  try {
    agentx = await createAgentX({
      apiKey,
      provider,
      model,
      baseUrl,
      logLevel: "silent",
    });

    await agentx.containers.create("doc-tester");

    const { record: image } = await agentx.images.create({
      containerId: "doc-tester",
      systemPrompt: SYSTEM_PROMPT,
    });

    const { agentId } = await agentx.agents.create({ imageId: image.imageId });

    // Collect response text
    let output = "";
    agentx.on("text_delta", (e: any) => {
      output += e.data.text;
    });

    // Send prompt and wait for completion
    await Promise.race([
      agentx.sessions.send(agentId, userPrompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), timeout)
      ),
    ]);

    output = output.trim();
    const passed = /\*{0,2}PASS\*{0,2}\b/m.test(output);
    return { passed, output };
  } catch (error: any) {
    return { passed: false, output: error.message || "Unknown error" };
  } finally {
    if (agentx) {
      try {
        await agentx.shutdown();
      } catch {}
    }
  }
}
