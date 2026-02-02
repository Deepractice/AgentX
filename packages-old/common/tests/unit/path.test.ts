import { describe, test, expect } from "bun:test";
import {
  getModuleDir,
  getPackageRoot,
  getMonorepoRoot,
  resolveFromRoot,
  resolveFromPackage,
} from "../../src/path";

describe("path utilities", () => {
  describe("getModuleDir", () => {
    test("returns directory of current module", () => {
      const dir = getModuleDir(import.meta);

      expect(dir).toBeString();
      expect(dir).toEndWith("/packages/common/tests/unit");
    });

    test("returns absolute path", () => {
      const dir = getModuleDir(import.meta);

      expect(dir.startsWith("/")).toBe(true);
    });
  });

  describe("getPackageRoot", () => {
    test("returns package root containing package.json", () => {
      const root = getPackageRoot(import.meta);

      expect(root).toBeString();
      expect(root).toEndWith("/packages/common");
    });

    test("package root contains package.json", async () => {
      const root = getPackageRoot(import.meta);
      const { existsSync } = await import("node:fs");
      const { join } = await import("node:path");

      expect(existsSync(join(root, "package.json"))).toBe(true);
    });
  });

  describe("getMonorepoRoot", () => {
    test("returns monorepo root", () => {
      const root = getMonorepoRoot(import.meta);

      expect(root).toBeString();
      expect(root).toEndWith("/AgentX");
    });

    test("monorepo root contains lock file", async () => {
      const root = getMonorepoRoot(import.meta);
      const { existsSync } = await import("node:fs");
      const { join } = await import("node:path");

      const hasPnpmWorkspace = existsSync(join(root, "pnpm-workspace.yaml"));
      const hasPnpmLock = existsSync(join(root, "pnpm-lock.yaml"));
      const hasBunLock = existsSync(join(root, "bun.lock"));
      const hasBunLockb = existsSync(join(root, "bun.lockb"));

      expect(hasPnpmWorkspace || hasPnpmLock || hasBunLock || hasBunLockb).toBe(true);
    });
  });

  describe("resolveFromRoot", () => {
    test("resolves path relative to monorepo root", () => {
      const path = resolveFromRoot(import.meta, "packages", "common");

      expect(path).toEndWith("/AgentX/packages/common");
    });

    test("handles single path segment", () => {
      const path = resolveFromRoot(import.meta, "data");

      expect(path).toEndWith("/AgentX/data");
    });

    test("handles nested path segments", () => {
      const path = resolveFromRoot(import.meta, "packages", "queue", "src", "index.ts");

      expect(path).toEndWith("/AgentX/packages/queue/src/index.ts");
    });
  });

  describe("resolveFromPackage", () => {
    test("resolves path relative to package root", () => {
      const path = resolveFromPackage(import.meta, "src");

      expect(path).toEndWith("/packages/common/src");
    });

    test("handles nested path segments", () => {
      const path = resolveFromPackage(import.meta, "src", "path", "index.ts");

      expect(path).toEndWith("/packages/common/src/path/index.ts");
    });

    test("handles tests directory", () => {
      const path = resolveFromPackage(import.meta, "tests", "unit");

      expect(path).toEndWith("/packages/common/tests/unit");
    });
  });
});
