/**
 * LLM Provider RPC Handlers
 */

import { type RpcHandlerRegistry, err, ok } from "@deepracticex/rpc";

export function registerLLMHandlers(registry: RpcHandlerRegistry): void {
  registry.register(
    "llm.create",
    "Create a new LLM provider configuration",
    async (runtime, params) => {
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
        containerId: runtime.platform.containerId,
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
    }
  );

  registry.register("llm.get", "Get an LLM provider by ID", async (runtime, params) => {
    const { id } = params as { id: string };
    const repo = runtime.platform.llmProviderRepository;
    if (!repo) return err(-32000, "LLM provider repository not available");
    const record = await repo.findLLMProviderById(id);
    return ok({ record });
  });

  registry.register("llm.list", "List all LLM providers", async (runtime) => {
    const repo = runtime.platform.llmProviderRepository;
    if (!repo) return err(-32000, "LLM provider repository not available");
    const records = await repo.findLLMProvidersByContainerId(runtime.platform.containerId);
    return ok({ records });
  });

  registry.register(
    "llm.update",
    "Update an LLM provider configuration",
    async (runtime, params) => {
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
    }
  );

  registry.register("llm.delete", "Delete an LLM provider", async (runtime, params) => {
    const { id } = params as { id: string };
    const repo = runtime.platform.llmProviderRepository;
    if (!repo) return err(-32000, "LLM provider repository not available");
    await repo.deleteLLMProvider(id);
    return ok({ id });
  });

  registry.register(
    "llm.default",
    "Get or set the default LLM provider",
    async (runtime, params) => {
      const { id } = params as { id?: string };
      const repo = runtime.platform.llmProviderRepository;
      if (!repo) return err(-32000, "LLM provider repository not available");

      if (id) {
        await repo.setDefaultLLMProvider(id);
        return ok({ id });
      }
      const record = await repo.findDefaultLLMProvider(runtime.platform.containerId);
      return ok({ record });
    }
  );
}
