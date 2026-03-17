/**
 * LLM Provider RPC Handlers
 */

import { DEFAULT_CONTAINER_ID } from "@agentxjs/core/container";
import type { RpcHandlerRegistry } from "../RpcHandlerRegistry";
import { err, ok } from "../RpcHandlerRegistry";

export function registerLLMHandlers(registry: RpcHandlerRegistry): void {
  registry.register("llm.create", async (runtime, params) => {
    const { name, vendor, protocol, apiKey, baseUrl, model } = params as {
      name: string;
      vendor: string;
      protocol: string;
      apiKey: string;
      baseUrl?: string;
      model?: string;
    };

    const repo = runtime.platform.llmProviderRepository;
    if (!repo) return err(-32000, "LLM provider repository not available");

    const { generateId } = await import("@deepracticex/id");
    const now = Date.now();
    const record = {
      id: generateId("llm"),
      containerId: DEFAULT_CONTAINER_ID,
      name,
      vendor,
      protocol: protocol as "anthropic" | "openai",
      apiKey,
      baseUrl,
      model,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    };

    await repo.saveLLMProvider(record);
    return ok({ record });
  });

  registry.register("llm.get", async (runtime, params) => {
    const { id } = params as { id: string };
    const repo = runtime.platform.llmProviderRepository;
    if (!repo) return err(-32000, "LLM provider repository not available");
    const record = await repo.findLLMProviderById(id);
    return ok({ record });
  });

  registry.register("llm.list", async (runtime, params) => {
    const { containerId } = params as { containerId: string };
    const repo = runtime.platform.llmProviderRepository;
    if (!repo) return err(-32000, "LLM provider repository not available");
    const records = await repo.findLLMProvidersByContainerId(containerId);
    return ok({ records });
  });

  registry.register("llm.update", async (runtime, params) => {
    const { id, updates } = params as { id: string; updates: Record<string, unknown> };
    const repo = runtime.platform.llmProviderRepository;
    if (!repo) return err(-32000, "LLM provider repository not available");

    const existing = await repo.findLLMProviderById(id);
    if (!existing) return err(404, `LLM provider not found: ${id}`);

    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      containerId: existing.containerId,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    };

    await repo.saveLLMProvider(updated);
    return ok({ record: updated });
  });

  registry.register("llm.delete", async (runtime, params) => {
    const { id } = params as { id: string };
    const repo = runtime.platform.llmProviderRepository;
    if (!repo) return err(-32000, "LLM provider repository not available");
    await repo.deleteLLMProvider(id);
    return ok({ id });
  });

  registry.register("llm.default", async (runtime, params) => {
    const { id, containerId } = params as { id?: string; containerId?: string };
    const repo = runtime.platform.llmProviderRepository;
    if (!repo) return err(-32000, "LLM provider repository not available");

    if (id) {
      await repo.setDefaultLLMProvider(id);
      return ok({ id });
    }
    if (containerId) {
      const record = await repo.findDefaultLLMProvider(containerId);
      return ok({ record });
    }
    return err(-32602, "Either id or containerId is required");
  });
}
