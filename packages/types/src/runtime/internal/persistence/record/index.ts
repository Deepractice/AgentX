/**
 * Storage Records - Pure data types for persistence
 *
 * These types define the storage schema used by both:
 * - SQLite schema (agentx-runtime)
 * - HTTP API contracts (agentx remote)
 *
 * ## ADR: Timestamp Convention
 *
 * All timestamp fields use `number` (Unix milliseconds) instead of `Date` because:
 * 1. JSON serialization: `Date` becomes string, `number` stays consistent
 * 2. Database storage: SQLite stores as INTEGER, no conversion needed
 * 3. Cross-platform: Same representation in Node.js, Browser, and Edge
 * 4. Performance: No parsing overhead when reading from storage
 *
 * Use `Date.now()` to create, `new Date(timestamp)` to display.
 */

export type { ContainerRecord, ContainerConfig } from "./ContainerRecord";
export type { ImageRecord, ImageMetadata } from "./ImageRecord";
export type { SessionRecord } from "./SessionRecord";
export type { MessageRecord } from "./MessageRecord";
export type { EnvironmentRecord } from "./EnvironmentRecord";
