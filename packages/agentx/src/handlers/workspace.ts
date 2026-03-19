/**
 * OS RPC Handlers — exposes AgentOS file operations via RPC
 */

import { type RpcHandlerRegistry, err, ok } from "@deepracticex/rpc";

export function registerOSHandlers(registry: RpcHandlerRegistry): void {
  registry.register("os.read", "Read a file from the agent's OS", async (runtime, params) => {
    const { imageId, path } = params as { imageId: string; path: string };
    const op = runtime.platform.osProvider;
    if (!op) return err(-32000, "OS not available");

    const img = await runtime.platform.imageRepository.findImageById(imageId);
    if (!img?.osId) return err(404, "Image has no OS");

    const os = await op.create(img.osId);
    const content = await os.fs.read(path);
    return ok({ content });
  });

  registry.register(
    "os.list",
    "List files in the agent's OS directory",
    async (runtime, params) => {
      const { imageId, path } = params as { imageId: string; path?: string };
      const op = runtime.platform.osProvider;
      if (!op) return err(-32000, "OS not available");

      const img = await runtime.platform.imageRepository.findImageById(imageId);
      if (!img?.osId) return err(404, "Image has no OS");

      const os = await op.create(img.osId);
      const files = await os.fs.list(path ?? ".");
      return ok({ files });
    }
  );

  registry.register(
    "os.write",
    "Write content to a file in the agent's OS",
    async (runtime, params) => {
      const { imageId, path, content } = params as {
        imageId: string;
        path: string;
        content: string;
      };
      const op = runtime.platform.osProvider;
      if (!op) return err(-32000, "OS not available");

      const img = await runtime.platform.imageRepository.findImageById(imageId);
      if (!img?.osId) return err(404, "Image has no OS");

      const os = await op.create(img.osId);
      await os.fs.write(path, content);
      return ok({ success: true });
    }
  );
}
