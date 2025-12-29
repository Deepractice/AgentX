/**
 * @agentxjs/persistence
 *
 * Multi-backend persistence layer for AgentX.
 * Supports Memory (default), SQLite, Redis, MongoDB, and SQL databases.
 *
 * @example
 * ```typescript
 * // Default (memory)
 * import { createPersistence, memoryDriver } from "@agentxjs/persistence";
 * const persistence = await createPersistence(memoryDriver());
 *
 * // SQLite
 * import { createPersistence } from "@agentxjs/persistence";
 * import { sqliteDriver } from "@agentxjs/persistence/sqlite";
 * const persistence = await createPersistence(sqliteDriver({ path: "./data.db" }));
 *
 * // Redis
 * import { createPersistence } from "@agentxjs/persistence";
 * import { redisDriver } from "@agentxjs/persistence/redis";
 * const persistence = await createPersistence(redisDriver({ url: "redis://localhost" }));
 * ```
 */

export { createPersistence } from "./Persistence";
export { memoryDriver } from "./drivers/memory";
export type { PersistenceDriver } from "./Persistence";

// Re-export repository implementations for advanced use
export { StorageImageRepository } from "./repository/StorageImageRepository";
export { StorageContainerRepository } from "./repository/StorageContainerRepository";
export { StorageSessionRepository } from "./repository/StorageSessionRepository";
