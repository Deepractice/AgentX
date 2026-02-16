/**
 * Contributor journey steps
 *
 * Strategy:
 * - Block 1 (@pending): agentDocTester verifies CONTRIBUTING.md quality
 * - Block 2: programmatic steps verify CONTRIBUTING.md accuracy against reality
 */

import { strict as assert } from "node:assert";
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { agentDocTester } from "@agentxjs/devtools/bdd";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

// ============================================================================
// State
// ============================================================================

let contributingContent = "";
let contributingPath = "";
let docRequirements: string[] = [];
let tempDir = "";
let lastExitCode = 0;

Before(() => {
  contributingContent = "";
  contributingPath = "";
  docRequirements = [];
  tempDir = "";
  lastExitCode = 0;
});

// ============================================================================
// Helpers
// ============================================================================

function readContributing(): string {
  if (!contributingContent) {
    contributingPath = resolve(ROOT, "CONTRIBUTING.md");
    assert.ok(existsSync(contributingPath), "CONTRIBUTING.md not found at project root");
    contributingContent = readFileSync(contributingPath, "utf-8");
  }
  return contributingContent;
}

function readJson(relPath: string) {
  return JSON.parse(readFileSync(resolve(ROOT, relPath), "utf-8"));
}

function collectScripts(): Set<string> {
  const scripts = new Set<string>();
  const rootPkg = readJson("package.json");
  for (const s of Object.keys(rootPkg.scripts || {})) scripts.add(s);

  for (const dir of ["packages", "apps"]) {
    if (!existsSync(resolve(ROOT, dir))) continue;
    for (const d of readdirSync(resolve(ROOT, dir))) {
      const pkgPath = resolve(ROOT, dir, d, "package.json");
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        for (const s of Object.keys(pkg.scripts || {})) scripts.add(s);
      }
    }
  }
  return scripts;
}

// ============================================================================
// Block 1: CONTRIBUTING.md quality (doc-tested via @pending)
// ============================================================================

Given("I am a new contributor who just cloned the repo", () => {
  docRequirements.push(
    "Written for someone who just cloned the repo and knows nothing about the project"
  );
});

When("I read CONTRIBUTING.md", () => {
  contributingPath = resolve(ROOT, "CONTRIBUTING.md");
  assert.ok(existsSync(contributingPath), "CONTRIBUTING.md not found");
});

Then("I should not need to read any other file to get started", () => {
  docRequirements.push(
    "Self-contained: a contributor can set up and start working without reading other files"
  );
});

// ============================================================================
// Block 2: CONTRIBUTING.md accuracy (programmatic verification)
// ============================================================================

Given("the CONTRIBUTING.md file", () => {
  readContributing();
});

Then("it should recommend {string} as the package manager", (pm: string) => {
  const content = readContributing();
  assert.ok(
    content.includes(`${pm} install`) || content.includes(`${pm} build`),
    `CONTRIBUTING.md does not recommend "${pm}" — commands not found`
  );
});

Then(
  "it should not mention {string} or {string} or {string} as the package manager",
  (pm1: string, pm2: string, pm3: string) => {
    const content = readContributing();
    for (const pm of [pm1, pm2, pm3]) {
      const pattern = new RegExp(`${pm}\\s+(install|build|dev|run|test)`, "i");
      assert.ok(
        !pattern.test(content),
        `CONTRIBUTING.md mentions "${pm}" as a package manager command`
      );
    }
  }
);

Then("the project should have a bun lock file", () => {
  assert.ok(
    existsSync(resolve(ROOT, "bun.lock")) || existsSync(resolve(ROOT, "bun.lockb")),
    "No bun.lock or bun.lockb found"
  );
});

Then("these scripts mentioned should exist in package.json:", (table: any) => {
  const allScripts = collectScripts();
  const expected = table.hashes().map((r: any) => r.script);
  const missing: string[] = [];

  for (const script of expected) {
    if (!allScripts.has(script)) {
      missing.push(script);
    }
  }

  assert.deepStrictEqual(
    missing,
    [],
    `Scripts mentioned in CONTRIBUTING.md but missing from package.json: ${missing.join(", ")}`
  );
});

Then("it should describe these directories that actually exist:", (table: any) => {
  const content = readContributing();
  for (const row of table.hashes()) {
    const dir = row.directory.replace(/\/$/, "");
    // Check CONTRIBUTING.md mentions it
    assert.ok(content.includes(dir), `CONTRIBUTING.md does not mention directory "${dir}"`);
    // Check it actually exists
    if (row.exists === "yes") {
      assert.ok(
        existsSync(resolve(ROOT, dir)),
        `Directory "${dir}" mentioned in CONTRIBUTING.md but does not exist`
      );
    }
  }
});

Then("it should mention these environment variables:", (table: any) => {
  const content = readContributing();
  const expected = table.hashes().map((r: any) => r.variable);
  const missing: string[] = [];

  for (const v of expected) {
    if (!content.includes(v)) {
      missing.push(v);
    }
  }

  assert.deepStrictEqual(
    missing,
    [],
    `CONTRIBUTING.md missing environment variables: ${missing.join(", ")}`
  );
});

Then("it should state Bun minimum version as {string}", (version: string) => {
  const content = readContributing();
  const pattern = new RegExp(`[Bb]un[*]*\\s+${version.replace(/\./g, "\\.")}`);
  assert.ok(
    pattern.test(content),
    `CONTRIBUTING.md does not state Bun minimum version as ${version}`
  );
});

Then("it should state Node.js minimum version as {string}", (version: string) => {
  const content = readContributing();
  const pattern = new RegExp(`[Nn]ode\\.?j?s?[*]*\\s+${version.replace(/\./g, "\\.")}`);
  assert.ok(
    pattern.test(content),
    `CONTRIBUTING.md does not state Node.js minimum version as ${version}`
  );
});

// ============================================================================
// Block 3: Bootstrap smoke test (@slow)
// ============================================================================

Given("a fresh clone of the repository in a temp directory", { timeout: 120000 }, () => {
  tempDir = mkdtempSync(resolve(tmpdir(), "agentx-smoke-"));
  // Clone committed state, then overlay uncommitted changes
  execSync(`git clone --depth 1 file://${ROOT} ${tempDir}`, { stdio: "pipe" });
  // Overlay all modified and untracked files from working tree
  execSync(
    `rsync -a --files-from=<(git ls-files -m -o --exclude-standard) "${ROOT}/" "${tempDir}/"`,
    { cwd: ROOT, stdio: "pipe", shell: "/bin/bash" }
  );
  assert.ok(
    existsSync(resolve(tempDir, "package.json")),
    "Clone failed: package.json not found in temp directory"
  );
});

When("I run {string} in the temp directory", { timeout: 300000 }, (command: string) => {
  // Clean env to simulate a real contributor's terminal:
  // - Remove NODE_ENV: bun auto-loads .env.local which may set NODE_ENV=development,
  //   causing Next.js build workers to prerender in dev mode and crash on React context.
  // - Strip bun-node shim from PATH for safety.
  const env = { ...process.env };
  delete env.NODE_ENV;
  env.PATH = (env.PATH || "")
    .split(":")
    .filter((p) => !p.includes("bun-node"))
    .join(":");
  try {
    execSync(command, { cwd: tempDir, stdio: "pipe", timeout: 300000, env });
    lastExitCode = 0;
  } catch (err: any) {
    lastExitCode = err.status ?? 1;
    const stderr = err.stderr?.toString().slice(-4000) || "";
    const stdout = err.stdout?.toString().slice(-4000) || "";
    const output = [stderr, stdout].filter(Boolean).join("\n---\n") || "(no output)";
    assert.fail(`Command "${command}" failed (exit ${lastExitCode}):\n${output}`);
  }
});

Then("the command should succeed", () => {
  assert.strictEqual(lastExitCode, 0, `Last command failed with exit code ${lastExitCode}`);
});

Then("the temp directory is cleaned up", () => {
  if (tempDir && existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = "";
  }
});

// ============================================================================
// After — Run agentDocTester for @pending scenarios + cleanup temp dir
// ============================================================================

After({ timeout: 120000 }, async () => {
  // Cleanup temp dir if test failed before reaching cleanup step
  if (tempDir && existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = "";
  }

  if (!contributingPath || docRequirements.length === 0) return;
  if (!existsSync(contributingPath)) return;

  const result = await agentDocTester({
    files: [contributingPath],
    requirements: docRequirements.join("\n"),
  });

  assert.ok(result.passed, `CONTRIBUTING.md review failed:\n${result.output}`);
});
