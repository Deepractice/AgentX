/**
 * Message RPC Handlers
 */

import type { UserContentPart } from "@agentxjs/core/agent";
import type { AgentXRuntime } from "@agentxjs/core/runtime";
import { type RpcHandlerRegistry, err, ok } from "@deepracticex/rpc";
import { resolveInstanceId } from "./instance";

export function registerMessageHandlers(registry: RpcHandlerRegistry<AgentXRuntime>): void {
  registry.register("message.send", "Send a message to an agent", async (runtime, params) => {
    const { instanceId, imageId, content, options } = params as {
      instanceId?: string;
      imageId?: string;
      content: string | UserContentPart[];
      options?: import("@agentxjs/core/driver").SendOptions;
    };
    const resolved = await resolveInstanceId(runtime, { instanceId, imageId });
    await runtime.receive(resolved, content, undefined, options);
    return ok({ instanceId: resolved, imageId });
  });

  registry.register(
    "runtime.rewind",
    "Rewind conversation to a specific message",
    async (runtime, params) => {
      const { instanceId, imageId, messageId } = params as {
        instanceId?: string;
        imageId?: string;
        messageId: string;
      };

      if (!messageId) return err(-32602, "messageId is required");

      const resolved = await resolveInstanceId(runtime, { instanceId, imageId });
      await runtime.rewind(resolved, messageId);
      return ok({ instanceId: resolved });
    }
  );
}
