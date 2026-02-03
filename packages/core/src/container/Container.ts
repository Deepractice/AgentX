/**
 * Container - Resource isolation unit
 *
 * Container provides an isolated environment for Images and Agents.
 * Each container can have multiple Images (conversations).
 */

import { createLogger } from "commonxjs/logger";
import type { ContainerRecord } from "../persistence/types";
import type { Container, ContainerContext, ContainerCreateConfig } from "./types";

const logger = createLogger("container/Container");

/**
 * ContainerImpl - Container implementation
 */
export class ContainerImpl implements Container {
  private constructor(
    private readonly record: ContainerRecord,
    private readonly context: ContainerContext
  ) {}

  // ==================== Getters ====================

  get containerId(): string {
    return this.record.containerId;
  }

  get createdAt(): number {
    return this.record.createdAt;
  }

  get updatedAt(): number {
    return this.record.updatedAt;
  }

  get config(): Record<string, unknown> | undefined {
    return this.record.config;
  }

  // ==================== Static Factory Methods ====================

  /**
   * Create a new container
   */
  static async create(
    config: ContainerCreateConfig,
    context: ContainerContext
  ): Promise<ContainerImpl> {
    const now = Date.now();
    const containerId = config.containerId ?? ContainerImpl.generateContainerId();

    const record: ContainerRecord = {
      containerId,
      createdAt: now,
      updatedAt: now,
      config: config.config,
    };

    await context.containerRepository.saveContainer(record);

    logger.info("Container created", { containerId });

    return new ContainerImpl(record, context);
  }

  /**
   * Load an existing container from storage
   */
  static async load(containerId: string, context: ContainerContext): Promise<ContainerImpl | null> {
    const record = await context.containerRepository.findContainerById(containerId);
    if (!record) {
      logger.debug("Container not found", { containerId });
      return null;
    }

    logger.debug("Container loaded", { containerId });
    return new ContainerImpl(record, context);
  }

  /**
   * Get or create a container
   */
  static async getOrCreate(containerId: string, context: ContainerContext): Promise<ContainerImpl> {
    const existing = await ContainerImpl.load(containerId, context);
    if (existing) {
      return existing;
    }

    return ContainerImpl.create({ containerId }, context);
  }

  /**
   * List all containers
   */
  static async listAll(context: ContainerContext): Promise<ContainerRecord[]> {
    return context.containerRepository.findAllContainers();
  }

  // ==================== Instance Methods ====================

  /**
   * Update container configuration
   */
  async update(updates: { config?: Record<string, unknown> }): Promise<Container> {
    const now = Date.now();
    const updatedRecord: ContainerRecord = {
      ...this.record,
      config: updates.config ?? this.record.config,
      updatedAt: now,
    };

    await this.context.containerRepository.saveContainer(updatedRecord);

    logger.info("Container updated", { containerId: this.containerId, updates });
    return new ContainerImpl(updatedRecord, this.context);
  }

  /**
   * Delete this container and all its resources
   */
  async delete(): Promise<void> {
    // Find all images in this container
    const images = await this.context.imageRepository.findImagesByContainerId(this.containerId);

    // Delete all images and their sessions
    for (const image of images) {
      await this.context.sessionRepository.deleteSession(image.sessionId);
      await this.context.imageRepository.deleteImage(image.imageId);
    }

    // Delete container
    await this.context.containerRepository.deleteContainer(this.containerId);

    logger.info("Container deleted", {
      containerId: this.containerId,
      imagesDeleted: images.length,
    });
  }

  /**
   * Get the underlying record
   */
  toRecord(): ContainerRecord {
    return { ...this.record };
  }

  // ==================== Private Helpers ====================

  private static generateContainerId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `ctr_${timestamp}_${random}`;
  }
}

/**
 * Create a new Container
 */
export async function createContainer(
  config: ContainerCreateConfig,
  context: ContainerContext
): Promise<Container> {
  return ContainerImpl.create(config, context);
}

/**
 * Load an existing Container
 */
export async function loadContainer(
  containerId: string,
  context: ContainerContext
): Promise<Container | null> {
  return ContainerImpl.load(containerId, context);
}

/**
 * Get or create a Container
 */
export async function getOrCreateContainer(
  containerId: string,
  context: ContainerContext
): Promise<Container> {
  return ContainerImpl.getOrCreate(containerId, context);
}
