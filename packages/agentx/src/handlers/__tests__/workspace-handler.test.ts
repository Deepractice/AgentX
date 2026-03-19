/**
 * OS RPC Handler Tests
 *
 * Verifies the server-side os.list/read/write handlers
 * work correctly through the RpcHandlerRegistry.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentXRuntime } from "@agentxjs/core/runtime";
import { RpcHandlerRegistry } from "@deepracticex/rpc";
import { registerOSHandlers } from "../workspace";

let tempDir: string;
let registry: RpcHandlerRegistry<AgentXRuntime>;

// Minimal runtime mock with real OS
function createMockRuntime(basePath: string) {
  const { LocalOSProvider } = require("@agentxjs/node-platform");
  const osProvider = new LocalOSProvider(basePath);

  return {
    platform: {
      osProvider,
      imageRepository: {
        findImageById: async (imageId: string) => {
          if (imageId === "img_test") {
            return { imageId: "img_test", osId: "os_test" };
          }
          return null;
        },
      },
    },
  } as any;
}

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "agentx-os-handler-test-"));
  registry = new RpcHandlerRegistry<AgentXRuntime>();
  registerOSHandlers(registry);
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("os.list RPC handler", () => {
  test("returns files from OS directory", async () => {
    // Create OS dir and files
    const osDir = join(tempDir, "os_test");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(osDir, { recursive: true });
    await writeFile(join(osDir, "hello.txt"), "world");
    await writeFile(join(osDir, "test.js"), "console.log('hi')");

    const runtime = createMockRuntime(tempDir);
    const result = await registry.handle(runtime, "os.list", {
      imageId: "img_test",
      path: ".",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const files = (result.data as any).files as Array<{ name: string; type: string }>;
      expect(files.length).toBe(2);
      const names = files.map((f) => f.name).sort();
      expect(names).toEqual(["hello.txt", "test.js"]);
    }
  });

  test("returns empty array for empty OS directory", async () => {
    const osDir = join(tempDir, "os_test");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(osDir, { recursive: true });

    const runtime = createMockRuntime(tempDir);
    const result = await registry.handle(runtime, "os.list", {
      imageId: "img_test",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).files).toEqual([]);
    }
  });

  test("returns error for unknown imageId", async () => {
    const runtime = createMockRuntime(tempDir);
    const result = await registry.handle(runtime, "os.list", {
      imageId: "img_unknown",
    });

    expect(result.success).toBe(false);
  });
});

describe("os.read RPC handler", () => {
  test("reads file content", async () => {
    const osDir = join(tempDir, "os_test");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(osDir, { recursive: true });
    await writeFile(join(osDir, "data.txt"), "hello world");

    const runtime = createMockRuntime(tempDir);
    const result = await registry.handle(runtime, "os.read", {
      imageId: "img_test",
      path: "data.txt",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).content).toBe("hello world");
    }
  });
});

describe("os.write RPC handler", () => {
  test("writes file and can read it back", async () => {
    const osDir = join(tempDir, "os_test");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(osDir, { recursive: true });

    const runtime = createMockRuntime(tempDir);

    // Write
    const writeResult = await registry.handle(runtime, "os.write", {
      imageId: "img_test",
      path: "output.txt",
      content: "written via RPC",
    });
    expect(writeResult.success).toBe(true);

    // Read back
    const readResult = await registry.handle(runtime, "os.read", {
      imageId: "img_test",
      path: "output.txt",
    });
    expect(readResult.success).toBe(true);
    if (readResult.success) {
      expect((readResult.data as any).content).toBe("written via RPC");
    }
  });
});
