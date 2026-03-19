/**
 * Instance RPC Handlers
 */

import type { AgentXRuntime } from "@agentxjs/core/runtime";
import type { RpcHandlerRegistry } from "../RpcHandlerRegistry";
import { ok } from "../RpcHandlerRegistry";

async function resolveInstanceId(
  runtime: AgentXRuntime,
  params: { instanceId?: string; imageId?: string }
): Promise<string> {
  const { instanceId, imageId } = params;

  if (instanceId) {
    const agent = runtime.getAgent(instanceId);
    if (agent) return instanceId;
  }

  if (imageId) {
    const existing = runtime
      .getAgents()
      .find((a) => a.imageId === imageId && a.lifecycle === "running");
    if (existing) return existing.instanceId;
    const agent = await runtime.createAgent({ imageId });
    return agent.instanceId;
  }

  throw new Error("Either instanceId or imageId is required");
}

export function registerInstanceHandlers(registry: RpcHandlerRegistry): void {
  registry.register("instance.get", "Get a running agent instance", async (runtime, params) => {
    const { instanceId } = params as { instanceId: string };
    const agent = runtime.getAgent(instanceId);
    return ok({
      agent: agent
        ? {
            instanceId: agent.instanceId,
            imageId: agent.imageId,
            containerId: agent.containerId,
            sessionId: agent.sessionId,
            lifecycle: agent.lifecycle,
          }
        : null,
      exists: !!agent,
    });
  });

  registry.register(
    "instance.list",
    "List all running agent instances",
    async (runtime, params) => {
      const { containerId } = params as { containerId?: string };
      const agents = containerId ? runtime.getAgentsByContainer(containerId) : runtime.getAgents();
      return ok({
        agents: agents.map((a) => ({
          instanceId: a.instanceId,
          imageId: a.imageId,
          containerId: a.containerId,
          sessionId: a.sessionId,
          lifecycle: a.lifecycle,
        })),
      });
    }
  );

  registry.register(
    "instance.destroy",
    "Destroy a running agent instance",
    async (runtime, params) => {
      const { instanceId } = params as { instanceId: string };
      const agent = runtime.getAgent(instanceId);
      if (!agent) return ok({ instanceId, success: false });
      await runtime.destroyAgent(instanceId);
      return ok({ instanceId, success: true });
    }
  );

  registry.register(
    "instance.destroyAll",
    "Destroy all agent instances in a container",
    async (runtime, params) => {
      const { containerId } = params as { containerId: string };
      const agents = runtime.getAgentsByContainer(containerId);
      for (const agent of agents) {
        await runtime.destroyAgent(agent.instanceId);
      }
      return ok({ containerId });
    }
  );

  registry.register(
    "instance.interrupt",
    "Interrupt an agent's current operation",
    async (runtime, params) => {
      const { instanceId, imageId } = params as { instanceId?: string; imageId?: string };
      const resolved = await resolveInstanceId(runtime, { instanceId, imageId });
      runtime.interrupt(resolved);
      return ok({ instanceId: resolved });
    }
  );
}

export { resolveInstanceId };
