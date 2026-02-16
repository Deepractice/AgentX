/**
 * Persistence Module
 *
 * Provides storage implementations for Node.js.
 *
 * @example
 * ```typescript
 * import { createPersistence, sqliteDriver, memoryDriver } from "@agentxjs/node-platform/persistence";
 *
 * // SQLite (persistent)
 * const persistence = await createPersistence(
 *   sqliteDriver({ path: "./data/agentx.db" })
 * );
 *
 * // Memory (testing)
 * const testPersistence = await createPersistence(memoryDriver());
 *
 * // Use repositories
 * await persistence.containers.saveContainer(record);
 * await persistence.images.saveImage(imageRecord);
 * await persistence.sessions.addMessage(sessionId, message);
 * ```
 */

export { memoryDriver } from "./memory";

// Factory
export { createPersistence } from "./Persistence";
// Repositories (for advanced use cases)
export { StorageContainerRepository } from "./StorageContainerRepository";
export { StorageImageRepository } from "./StorageImageRepository";
export { StorageSessionRepository } from "./StorageSessionRepository";
// Drivers
export { type SqliteDriverOptions, sqliteDriver } from "./sqlite";
// Types
export type { Persistence, PersistenceDriver } from "./types";
