/**
 * Message RPC Handlers
 */

import type { UserContentPart } from "@agentxjs/core/agent";
import type { RpcHandlerRegistry } from "../RpcHandlerRegistry";
import { err, ok } from "../RpcHandlerRegistry";
import { resolveInstanceId } from "./instance";

export function registerMessageHandlers(registry: RpcHandlerRegistry): void {
  registry.register("message.send", async (runtime, params) => {
    const { instanceId, imageId, content } = params as {
      instanceId?: string;
      imageId?: string;
      content: string | UserContentPart[];
    };
    const resolved = await resolveInstanceId(runtime, { instanceId, imageId });
    await runtime.receive(resolved, content);
    return ok({ instanceId: resolved, imageId });
  });

  registry.register("runtime.rewind", async (runtime, params) => {
    const { instanceId, imageId, messageId } = params as {
      instanceId?: string;
      imageId?: string;
      messageId: string;
    };

    if (!messageId) return err(-32602, "messageId is required");

    const resolved = await resolveInstanceId(runtime, { instanceId, imageId });
    await runtime.rewind(resolved, messageId);
    return ok({ instanceId: resolved });
  });
}
