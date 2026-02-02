/**
 * Persistence Module - Storage Abstraction Layer
 *
 * Provides unified storage interfaces for AgentX data:
 * - ImageRepository: Agent images/snapshots
 * - ContainerRepository: Containers
 * - SessionRepository: Sessions
 *
 * @packageDocumentation
 */

// Domain-specific repositories
export type { ImageRepository } from "./ImageRepository";
export type { ContainerRepository } from "./ContainerRepository";
export type { SessionRepository } from "./SessionRepository";

// Unified repository interface (flat methods)
export type { Repository } from "./Repository";

// Persistence interface (domain-grouped access)
export type { Persistence } from "./Persistence";

// Record types (storage schema)
export * from "./record";
