/**
 * Workspace RPC Handlers
 */

import type { RpcHandlerRegistry } from "../RpcHandlerRegistry";
import { err, ok } from "../RpcHandlerRegistry";

export function registerWorkspaceHandlers(registry: RpcHandlerRegistry): void {
  registry.register("workspace.read", async (runtime, params) => {
    const { imageId, path } = params as { imageId: string; path: string };
    const wp = runtime.platform.workspaceProvider;
    if (!wp) return err(-32000, "Workspace not available");

    const img = await runtime.platform.imageRepository.findImageById(imageId);
    if (!img?.workspaceId) return err(404, "Image has no workspace");

    const ws = await wp.create(img.workspaceId);
    const content = await ws.read(path);
    return ok({ content });
  });

  registry.register("workspace.list", async (runtime, params) => {
    const { imageId, path } = params as { imageId: string; path?: string };
    const wp = runtime.platform.workspaceProvider;
    if (!wp) return err(-32000, "Workspace not available");

    const img = await runtime.platform.imageRepository.findImageById(imageId);
    if (!img?.workspaceId) return err(404, "Image has no workspace");

    const ws = await wp.create(img.workspaceId);
    const files = await ws.list(path ?? ".");
    return ok({ files });
  });

  registry.register("workspace.write", async (runtime, params) => {
    const { imageId, path, content } = params as { imageId: string; path: string; content: string };
    const wp = runtime.platform.workspaceProvider;
    if (!wp) return err(-32000, "Workspace not available");

    const img = await runtime.platform.imageRepository.findImageById(imageId);
    if (!img?.workspaceId) return err(404, "Image has no workspace");

    const ws = await wp.create(img.workspaceId);
    await ws.write(path, content);
    return ok({ success: true });
  });
}
