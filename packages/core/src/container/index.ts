/**
 * Container Module
 *
 * Manages resource isolation containers.
 *
 * Usage:
 * ```typescript
 * import {
 *   createContainer,
 *   loadContainer,
 *   getOrCreateContainer,
 *   type ContainerRepository,
 * } from "@agentxjs/core/container";
 *
 * const context = {
 *   containerRepository: myContainerRepository,
 *   imageRepository: myImageRepository,
 *   sessionRepository: mySessionRepository,
 * };
 *
 * // Create new container
 * const container = await createContainer({
 *   containerId: "user-123",
 *   config: { maxAgents: 10 },
 * }, context);
 *
 * // Load existing container
 * const existing = await loadContainer("user-123", context);
 *
 * // Get or create
 * const container = await getOrCreateContainer("user-123", context);
 * ```
 */

export { ContainerImpl, createContainer, getOrCreateContainer, loadContainer } from "./Container";
export type {
  Container,
  ContainerConfig,
  ContainerContext,
  ContainerCreateConfig,
  ContainerRecord,
  ContainerRepository,
} from "./types";
