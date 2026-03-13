/**
 * StoragePrototypeRepository - unstorage-based PrototypeRepository
 *
 * Uses unstorage for backend-agnostic storage (Memory, Redis, SQLite, etc.)
 */

import type { PrototypeRecord, PrototypeRepository } from "@agentxjs/core/persistence";
import { createLogger } from "commonxjs/logger";
import type { Storage } from "unstorage";

const logger = createLogger("node-platform/PrototypeRepository");

/** Key prefix for prototypes */
const PREFIX = "prototypes";

/** Index prefix for container lookup */
const INDEX_BY_CONTAINER = "idx:prototypes:container";

/**
 * StoragePrototypeRepository - unstorage implementation
 */
export class StoragePrototypeRepository implements PrototypeRepository {
  constructor(private readonly storage: Storage) {}

  private key(prototypeId: string): string {
    return `${PREFIX}:${prototypeId}`;
  }

  private containerIndexKey(containerId: string, prototypeId: string): string {
    return `${INDEX_BY_CONTAINER}:${containerId}:${prototypeId}`;
  }

  async savePrototype(record: PrototypeRecord): Promise<void> {
    // Save main record
    await this.storage.setItem(this.key(record.prototypeId), record);

    // Save index for container lookup
    await this.storage.setItem(
      this.containerIndexKey(record.containerId, record.prototypeId),
      record.prototypeId
    );

    logger.debug("Prototype saved", { prototypeId: record.prototypeId });
  }

  async findPrototypeById(prototypeId: string): Promise<PrototypeRecord | null> {
    const record = await this.storage.getItem<PrototypeRecord>(this.key(prototypeId));
    return record ?? null;
  }

  async findAllPrototypes(): Promise<PrototypeRecord[]> {
    const keys = await this.storage.getKeys(PREFIX);
    const records: PrototypeRecord[] = [];

    for (const key of keys) {
      // Skip index keys
      if (key.startsWith("idx:")) continue;

      const record = await this.storage.getItem<PrototypeRecord>(key);
      if (record) {
        records.push(record);
      }
    }

    return records.sort((a, b) => b.createdAt - a.createdAt);
  }

  async findPrototypesByContainerId(containerId: string): Promise<PrototypeRecord[]> {
    const indexPrefix = `${INDEX_BY_CONTAINER}:${containerId}`;
    const keys = await this.storage.getKeys(indexPrefix);
    const records: PrototypeRecord[] = [];

    for (const key of keys) {
      const prototypeId = await this.storage.getItem<string>(key);
      if (prototypeId) {
        const record = await this.findPrototypeById(prototypeId);
        if (record) {
          records.push(record);
        }
      }
    }

    return records.sort((a, b) => b.createdAt - a.createdAt);
  }

  async deletePrototype(prototypeId: string): Promise<void> {
    // Get record for index cleanup
    const record = await this.findPrototypeById(prototypeId);

    // Delete main record
    await this.storage.removeItem(this.key(prototypeId));

    // Delete indexes
    if (record) {
      await this.storage.removeItem(this.containerIndexKey(record.containerId, prototypeId));
    }

    logger.debug("Prototype deleted", { prototypeId });
  }

  async prototypeExists(prototypeId: string): Promise<boolean> {
    return await this.storage.hasItem(this.key(prototypeId));
  }
}
