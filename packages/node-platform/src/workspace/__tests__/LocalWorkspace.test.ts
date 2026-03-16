/**
 * LocalWorkspace Tests
 *
 * Tests basic file operations and path safety.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalWorkspace } from "../LocalWorkspace";

let workspace: LocalWorkspace;
let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "agentx-ws-test-"));
  workspace = new LocalWorkspace(tempDir);
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// ============================================================================
// Basic Operations
// ============================================================================

describe("LocalWorkspace basic operations", () => {
  test("write and read a file", async () => {
    await workspace.write("hello.txt", "Hello, World!");
    const content = await workspace.read("hello.txt");
    expect(content).toBe("Hello, World!");
  });

  test("write creates parent directories", async () => {
    await workspace.write("a/b/c/deep.txt", "deep content");
    const content = await workspace.read("a/b/c/deep.txt");
    expect(content).toBe("deep content");
  });

  test("read with offset and limit", async () => {
    await workspace.write("lines.txt", "line1\nline2\nline3\nline4\nline5");
    const content = await workspace.read("lines.txt", { offset: 2, limit: 2 });
    expect(content).toBe("line2\nline3");
  });

  test("exists returns true for existing file", async () => {
    await workspace.write("exists.txt", "content");
    expect(await workspace.exists("exists.txt")).toBe(true);
  });

  test("exists returns false for non-existing file", async () => {
    expect(await workspace.exists("nope.txt")).toBe(false);
  });

  test("stat returns file info", async () => {
    await workspace.write("info.txt", "some content");
    const stat = await workspace.stat("info.txt");
    expect(stat).not.toBeNull();
    expect(stat!.type).toBe("file");
    expect(stat!.size).toBeGreaterThan(0);
  });

  test("stat returns null for non-existing", async () => {
    const stat = await workspace.stat("nope.txt");
    expect(stat).toBeNull();
  });

  test("list returns directory entries", async () => {
    await workspace.write("a.txt", "a");
    await workspace.write("b.txt", "b");
    await workspace.mkdir("subdir");
    const entries = await workspace.list(".");
    const names = entries.map((e) => e.name).sort();
    expect(names).toContain("a.txt");
    expect(names).toContain("b.txt");
    expect(names).toContain("subdir");
    const subdir = entries.find((e) => e.name === "subdir");
    expect(subdir!.type).toBe("directory");
  });

  test("remove deletes a file", async () => {
    await workspace.write("to-delete.txt", "bye");
    expect(await workspace.exists("to-delete.txt")).toBe(true);
    await workspace.remove("to-delete.txt");
    expect(await workspace.exists("to-delete.txt")).toBe(false);
  });

  test("mkdir creates nested directories", async () => {
    await workspace.mkdir("x/y/z");
    const stat = await workspace.stat("x/y/z");
    expect(stat).not.toBeNull();
    expect(stat!.type).toBe("directory");
  });
});

// ============================================================================
// Path Safety
// ============================================================================

describe("LocalWorkspace path safety", () => {
  test("rejects path traversal with ../", async () => {
    expect(workspace.read("../../../etc/passwd")).rejects.toThrow("Path safety violation");
  });

  test("rejects absolute path outside root", async () => {
    expect(workspace.read("/etc/passwd")).rejects.toThrow("Path safety violation");
  });
});

// ============================================================================
// Search (SearchableWorkspace)
// ============================================================================

describe("LocalWorkspace search", () => {
  test("grep finds matching lines", async () => {
    await workspace.write("code.ts", 'const x = 1;\nconst TODO = "fix";\nconst y = 2;');
    const matches = await workspace.grep("TODO");
    expect(matches.length).toBe(1);
    expect(matches[0].file).toContain("code.ts");
    expect(matches[0].line).toBe(2);
    expect(matches[0].content).toContain("TODO");
  });

  test("glob finds matching files", async () => {
    await workspace.write("a.ts", "");
    await workspace.write("b.ts", "");
    await workspace.write("c.js", "");
    const tsFiles = await workspace.glob("*.ts");
    expect(tsFiles.length).toBe(2);
    expect(tsFiles.sort()).toEqual(["a.ts", "b.ts"]);
  });
});

// ============================================================================
// Watch (WatchableWorkspace)
// ============================================================================

describe("LocalWorkspace watch", () => {
  test("watch detects file creation", async () => {
    const events: { type: string; path: string }[] = [];

    const stop = workspace.watch((event) => {
      events.push(event);
    });

    // Write a file to trigger the watcher
    await workspace.write("watched.txt", "hello");

    // Wait for fs.watch to fire (async)
    await new Promise((resolve) => setTimeout(resolve, 300));

    stop();

    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.path.includes("watched.txt"))).toBe(true);
  });
});
