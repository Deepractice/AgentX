/**
 * Persistence Module
 *
 * Provides standard interfaces for data persistence:
 * - ContainerRepository: Container CRUD operations
 * - ImageRepository: Image (conversation) CRUD operations
 * - SessionRepository: Session and message operations
 *
 * Implementations are provided by platform packages:
 * - @agentxjs/node: SQLite-based repositories
 * - @agentxjs/cloudflare: Durable Objects-based repositories
 */

export type {
  ContainerConfig,
  // Record types
  ContainerRecord,
  // Repository interfaces
  ContainerRepository,
  ImageMetadata,
  ImageRecord,
  ImageRepository,
  // Config types
  McpServerConfig,
  SessionRecord,
  SessionRepository,
} from "./types";
