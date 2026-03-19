/**
 * StorageLLMProviderRepository - unstorage-based LLMProviderRepository
 *
 * Uses unstorage for backend-agnostic storage (Memory, Redis, SQLite, etc.)
 */

import type { LLMProviderRecord, LLMProviderRepository } from "@agentxjs/core/persistence";
import { createLogger } from "@deepracticex/logger";
import type { Storage } from "unstorage";

const logger = createLogger("node-platform/LLMProviderRepository");

/** Key prefix for LLM providers */
const PREFIX = "llm-providers";

/** Index prefix for container lookup */
const IDX_CONTAINER = "idx:llm-providers:container";

/**
 * StorageLLMProviderRepository - unstorage implementation
 */
export class StorageLLMProviderRepository implements LLMProviderRepository {
  constructor(private readonly storage: Storage) {}

  private key(id: string): string {
    return `${PREFIX}:${id}`;
  }

  private containerIndexKey(containerId: string, id: string): string {
    return `${IDX_CONTAINER}:${containerId}:${id}`;
  }

  async saveLLMProvider(record: LLMProviderRecord): Promise<void> {
    await this.storage.setItem(this.key(record.id), record);
    // Container index
    await this.storage.setItem(this.containerIndexKey(record.containerId, record.id), record.id);
    logger.debug("LLM provider saved", { id: record.id, name: record.name });
  }

  async findLLMProviderById(id: string): Promise<LLMProviderRecord | null> {
    const record = await this.storage.getItem<LLMProviderRecord>(this.key(id));
    return record ?? null;
  }

  async findLLMProvidersByContainerId(containerId: string): Promise<LLMProviderRecord[]> {
    const indexKeys = await this.storage.getKeys(`${IDX_CONTAINER}:${containerId}`);
    const records: LLMProviderRecord[] = [];

    for (const indexKey of indexKeys) {
      const id = await this.storage.getItem<string>(indexKey);
      if (id) {
        const record = await this.storage.getItem<LLMProviderRecord>(this.key(id));
        if (record) {
          records.push(record);
        }
      }
    }

    return records.sort((a, b) => b.createdAt - a.createdAt);
  }

  async deleteLLMProvider(id: string): Promise<void> {
    const record = await this.findLLMProviderById(id);
    if (record) {
      await this.storage.removeItem(this.containerIndexKey(record.containerId, id));
    }
    await this.storage.removeItem(this.key(id));
    logger.debug("LLM provider deleted", { id });
  }

  async llmProviderExists(id: string): Promise<boolean> {
    return await this.storage.hasItem(this.key(id));
  }

  async findDefaultLLMProvider(containerId: string): Promise<LLMProviderRecord | null> {
    const providers = await this.findLLMProvidersByContainerId(containerId);
    return providers.find((p) => p.isDefault) ?? null;
  }

  async setDefaultLLMProvider(id: string): Promise<void> {
    const record = await this.findLLMProviderById(id);
    if (!record) {
      throw new Error(`LLM provider not found: ${id}`);
    }

    // Unset previous default in the same container
    const providers = await this.findLLMProvidersByContainerId(record.containerId);
    for (const provider of providers) {
      if (provider.isDefault && provider.id !== id) {
        provider.isDefault = false;
        provider.updatedAt = Date.now();
        await this.storage.setItem(this.key(provider.id), provider);
      }
    }

    // Set new default
    record.isDefault = true;
    record.updatedAt = Date.now();
    await this.storage.setItem(this.key(record.id), record);
    logger.debug("LLM provider set as default", { id, containerId: record.containerId });
  }
}
