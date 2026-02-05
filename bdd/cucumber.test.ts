/**
 * Thin wrapper so `bun test` can run Cucumber BDD tests.
 *
 * Usage:
 *   cd bdd && bun test                        # All tests
 *   cd bdd && BDD_TAGS='@bug' bun test        # With tag filter
 */

import { describe, it, expect } from "bun:test";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("BDD", () => {
  it("cucumber-js tests pass", () => {
    const tags = process.env.BDD_TAGS;

    const args = ["cucumber-js"];
    if (tags) {
      args.push("--tags", tags);
    }

    const result = spawnSync("npx", args, {
      cwd: __dirname,
      env: { ...process.env, NODE_OPTIONS: "--import tsx" },
      stdio: "inherit",
      timeout: 180_000,
    });

    expect(result.status).toBe(0);
  }, 180_000);
});
