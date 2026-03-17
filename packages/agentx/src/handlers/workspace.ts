/**
 * Workspace RPC Handlers — uses AgentOS for file operations
 */

import type { RpcHandlerRegistry } from "../RpcHandlerRegistry";
import { err, ok } from "../RpcHandlerRegistry";

export function registerWorkspaceHandlers(registry: RpcHandlerRegistry): void {
  registry.register("workspace.read", async (runtime, params) => {
    const { imageId, path } = params as { imageId: string; path: string };
    const op = runtime.platform.osProvider;
    if (!op) return err(-32000, "OS not available");

    const img = await runtime.platform.imageRepository.findImageById(imageId);
    if (!img?.workspaceId) return err(404, "Image has no workspace");

    const os = await op.create(img.workspaceId);
    const content = await os.fs.read(path);
    return ok({ content });
  });

  registry.register("workspace.list", async (runtime, params) => {
    const { imageId, path } = params as { imageId: string; path?: string };
    const op = runtime.platform.osProvider;
    if (!op) return err(-32000, "OS not available");

    const img = await runtime.platform.imageRepository.findImageById(imageId);
    if (!img?.workspaceId) return err(404, "Image has no workspace");

    const os = await op.create(img.workspaceId);
    const files = await os.fs.list(path ?? ".");
    return ok({ files });
  });

  registry.register("workspace.write", async (runtime, params) => {
    const { imageId, path, content } = params as { imageId: string; path: string; content: string };
    const op = runtime.platform.osProvider;
    if (!op) return err(-32000, "OS not available");

    const img = await runtime.platform.imageRepository.findImageById(imageId);
    if (!img?.workspaceId) return err(404, "Image has no workspace");

    const os = await op.create(img.workspaceId);
    await os.fs.write(path, content);
    return ok({ success: true });
  });
}
