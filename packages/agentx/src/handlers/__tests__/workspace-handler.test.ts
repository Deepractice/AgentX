/**
 * Workspace RPC Handler Tests
 *
 * Verifies the server-side workspace.list/read/write handlers
 * work correctly through the RpcHandlerRegistry.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RpcHandlerRegistry } from "../../RpcHandlerRegistry";
import { registerWorkspaceHandlers } from "../workspace";

let tempDir: string;
let registry: RpcHandlerRegistry;

// Minimal runtime mock with real workspace
function createMockRuntime(workspacesDir: string) {
  const { LocalWorkspaceProvider } = require("@agentxjs/node-platform/workspace");
  const workspaceProvider = new LocalWorkspaceProvider(workspacesDir);

  return {
    platform: {
      workspaceProvider,
      imageRepository: {
        findImageById: async (imageId: string) => {
          if (imageId === "img_test") {
            return { imageId: "img_test", workspaceId: "ws_test" };
          }
          return null;
        },
      },
    },
  } as any;
}

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "agentx-ws-handler-test-"));
  registry = new RpcHandlerRegistry();
  registerWorkspaceHandlers(registry);
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("workspace.list RPC handler", () => {
  test("returns files from workspace directory", async () => {
    // Create workspace dir and files
    const wsDir = join(tempDir, "ws_test");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(wsDir, { recursive: true });
    await writeFile(join(wsDir, "hello.txt"), "world");
    await writeFile(join(wsDir, "test.js"), "console.log('hi')");

    const runtime = createMockRuntime(tempDir);
    const result = await registry.handle(runtime, "workspace.list", {
      imageId: "img_test",
      path: ".",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const files = result.data.files as Array<{ name: string; type: string }>;
      expect(files.length).toBe(2);
      const names = files.map((f) => f.name).sort();
      expect(names).toEqual(["hello.txt", "test.js"]);
    }
  });

  test("returns empty array for empty workspace", async () => {
    const wsDir = join(tempDir, "ws_test");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(wsDir, { recursive: true });

    const runtime = createMockRuntime(tempDir);
    const result = await registry.handle(runtime, "workspace.list", {
      imageId: "img_test",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.files).toEqual([]);
    }
  });

  test("returns error for unknown imageId", async () => {
    const runtime = createMockRuntime(tempDir);
    const result = await registry.handle(runtime, "workspace.list", {
      imageId: "img_unknown",
    });

    expect(result.success).toBe(false);
  });
});

describe("workspace.read RPC handler", () => {
  test("reads file content", async () => {
    const wsDir = join(tempDir, "ws_test");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(wsDir, { recursive: true });
    await writeFile(join(wsDir, "data.txt"), "hello world");

    const runtime = createMockRuntime(tempDir);
    const result = await registry.handle(runtime, "workspace.read", {
      imageId: "img_test",
      path: "data.txt",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("hello world");
    }
  });
});

describe("workspace.write RPC handler", () => {
  test("writes file and can read it back", async () => {
    const wsDir = join(tempDir, "ws_test");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(wsDir, { recursive: true });

    const runtime = createMockRuntime(tempDir);

    // Write
    const writeResult = await registry.handle(runtime, "workspace.write", {
      imageId: "img_test",
      path: "output.txt",
      content: "written via RPC",
    });
    expect(writeResult.success).toBe(true);

    // Read back
    const readResult = await registry.handle(runtime, "workspace.read", {
      imageId: "img_test",
      path: "output.txt",
    });
    expect(readResult.success).toBe(true);
    if (readResult.success) {
      expect(readResult.data.content).toBe("written via RPC");
    }
  });
});
