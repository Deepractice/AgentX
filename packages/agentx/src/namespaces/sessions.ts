/**
 * Session namespace factories (messaging)
 */

import type { Message, UserContentPart } from "@agentxjs/core/agent";
import type { RpcClient } from "@agentxjs/core/network";
import type { AgentXRuntime } from "@agentxjs/core/runtime";
import type { BaseResponse, InstanceInfo, MessageSendResponse, SessionNamespace } from "../types";

/**
 * Create local session namespace backed by embedded runtime
 */
/**
 * Resolve an imageId or instanceId to a running agent instanceId.
 * If no agent exists for this imageId, auto-creates one.
 */
async function resolveLocal(runtime: AgentXRuntime, id: string): Promise<string> {
  // Direct instanceId
  if (id.startsWith("inst_")) {
    const agent = runtime.getAgent(id);
    if (agent) return id;
  }

  // imageId — find existing or auto-create
  const imageId = id.startsWith("img_") ? id : id;
  const existing = runtime
    .getAgents()
    .find((a) => a.imageId === imageId && a.lifecycle === "running");
  if (existing) return existing.instanceId;

  const agent = await runtime.createAgent({ imageId });
  return agent.instanceId;
}

export function createLocalSessions(runtime: AgentXRuntime): SessionNamespace {
  return {
    async send(id: string, content: string | unknown[]): Promise<MessageSendResponse> {
      const instanceId = await resolveLocal(runtime, id);
      await runtime.receive(instanceId, content as string | UserContentPart[]);
      return { instanceId, requestId: "" };
    },

    async interrupt(id: string): Promise<BaseResponse> {
      const instanceId = await resolveLocal(runtime, id);
      runtime.interrupt(instanceId);
      return { requestId: "" };
    },

    async getMessages(id: string): Promise<Message[]> {
      // For imageId, get messages directly from session
      if (id.startsWith("img_")) {
        const image = await runtime.platform.imageRepository.findImageById(id);
        if (!image) return [];
        return runtime.platform.sessionRepository.getMessages(image.sessionId);
      }
      const agent = runtime.getAgent(id);
      if (!agent) return [];
      return runtime.platform.sessionRepository.getMessages(agent.sessionId);
    },

    async truncateAfter(id: string, messageId: string): Promise<BaseResponse> {
      // Resolve to sessionId
      let sessionId: string;
      if (id.startsWith("img_")) {
        const image = await runtime.platform.imageRepository.findImageById(id);
        if (!image) throw new Error(`Image not found: ${id}`);
        sessionId = image.sessionId;
      } else {
        const agent = runtime.getAgent(id);
        if (!agent) throw new Error(`Agent not found: ${id}`);
        sessionId = agent.sessionId;
      }
      const messages = await runtime.platform.sessionRepository.getMessages(sessionId);
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx === -1) throw new Error(`Message not found: ${messageId}`);
      const kept = messages.slice(0, idx + 1);
      await runtime.platform.sessionRepository.clearMessages(sessionId);
      for (const msg of kept) {
        await runtime.platform.sessionRepository.addMessage(sessionId, msg);
      }
      return { requestId: "" };
    },
  };
}

/**
 * Create remote session namespace backed by RPC client
 */
/**
 * Detect whether an ID is an imageId or instanceId based on prefix.
 * imageId starts with "img_", instanceId starts with "inst_".
 */
function resolveId(id: string): { imageId?: string; instanceId?: string } {
  if (id.startsWith("inst_")) return { instanceId: id };
  return { imageId: id };
}

export function createRemoteSessions(rpcClient: RpcClient): SessionNamespace {
  return {
    async send(id: string, content: string | unknown[]): Promise<MessageSendResponse> {
      const result = await rpcClient.call<MessageSendResponse>("message.send", {
        ...resolveId(id),
        content,
      });
      return { ...result, requestId: "" };
    },

    async interrupt(id: string): Promise<BaseResponse> {
      const result = await rpcClient.call<BaseResponse>("instance.interrupt", {
        ...resolveId(id),
      });
      return { ...result, requestId: "" };
    },

    async getMessages(id: string): Promise<Message[]> {
      // For instanceId, resolve to imageId first
      if (id.startsWith("inst_")) {
        const agentRes = await rpcClient.call<{ agent: { imageId: string } | null }>(
          "instance.get",
          { instanceId: id }
        );
        if (!agentRes.agent) return [];
        id = agentRes.agent.imageId;
      }
      const msgRes = await rpcClient.call<{ messages: Message[] }>("image.messages", {
        imageId: id,
      });
      return msgRes.messages ?? [];
    },

    async truncateAfter(id: string, messageId: string): Promise<BaseResponse> {
      await rpcClient.call("message.truncateAfter", { ...resolveId(id), messageId });
      return { requestId: "" };
    },
  };
}
