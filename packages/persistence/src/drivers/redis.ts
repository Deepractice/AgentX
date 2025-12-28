/**
 * Redis Driver - Redis database storage
 *
 * Requirements:
 * - Install: npm install ioredis
 *
 * @example
 * ```typescript
 * import { createPersistence } from "@agentxjs/persistence";
 * import { redisDriver } from "@agentxjs/persistence/redis";
 *
 * const persistence = await createPersistence(
 *   redisDriver({ url: "redis://localhost:6379" })
 * );
 * ```
 */

import { createStorage, type Storage } from "unstorage";
import type { PersistenceDriver } from "../Persistence";

export interface RedisDriverOptions {
  /**
   * Redis connection URL
   * @example "redis://localhost:6379"
   */
  url: string;

  /**
   * Key prefix for all keys
   * @default "agentx"
   */
  base?: string;
}

/**
 * Create a Redis driver
 *
 * @param options - Driver options
 */
export function redisDriver(options: RedisDriverOptions): PersistenceDriver {
  return {
    async createStorage(): Promise<Storage> {
      const { default: driver } = await import("unstorage/drivers/redis");

      return createStorage({
        driver: driver({
          url: options.url,
          base: options.base ?? "agentx",
        }),
      });
    },
  };
}
