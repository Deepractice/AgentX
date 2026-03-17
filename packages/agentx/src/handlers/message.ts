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

  registry.register("message.truncateAfter", async (runtime, params) => {
    const { instanceId, imageId, messageId } = params as {
      instanceId?: string;
      imageId?: string;
      messageId: string;
    };

    if (!messageId) return err(-32602, "messageId is required");

    const resolved = await resolveInstanceId(runtime, { instanceId, imageId });
    const agent = runtime.getAgent(resolved);
    if (!agent) return err(-32602, `Agent not found: ${resolved}`);

    const { sessionRepository } = runtime.platform;
    const messages = await sessionRepository.getMessages(agent.sessionId);
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return err(-32602, `Message not found: ${messageId}`);

    const kept = messages.slice(0, idx + 1);
    await sessionRepository.clearMessages(agent.sessionId);
    for (const msg of kept) {
      await sessionRepository.addMessage(agent.sessionId, msg);
    }

    return ok({ truncatedCount: messages.length - kept.length });
  });
}
