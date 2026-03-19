/**
 * Image - Persistent conversation entity
 *
 * Image is the primary entity that users interact with (displayed as "conversation").
 * Agent is a transient runtime instance created from Image.
 */

import { createLogger } from "@deepracticex/logger";
import type { McpServerConfig } from "../persistence/types";
import type { Image, ImageContext, ImageCreateConfig, ImageRecord } from "./types";

const logger = createLogger("image/Image");

/**
 * ImageImpl - Image implementation
 */
export class ImageImpl implements Image {
  private constructor(
    private readonly record: ImageRecord,
    private readonly context: ImageContext
  ) {}

  // ==================== Getters ====================

  get imageId(): string {
    return this.record.imageId;
  }

  get containerId(): string {
    return this.record.containerId;
  }

  get sessionId(): string {
    return this.record.sessionId;
  }

  get name(): string {
    return this.record.name;
  }

  get description(): string | undefined {
    return this.record.description;
  }

  get roleId(): string | undefined {
    return this.record.roleId;
  }

  get model(): string | undefined {
    return this.record.model;
  }

  get systemPrompt(): string | undefined {
    return this.record.systemPrompt;
  }

  get mcpServers(): Record<string, McpServerConfig> | undefined {
    return this.record.mcpServers;
  }

  get thinking(): "disabled" | "low" | "medium" | "high" | undefined {
    return this.record.thinking;
  }

  get providerOptions(): Record<string, unknown> | undefined {
    return this.record.providerOptions;
  }

  get customData(): Record<string, unknown> | undefined {
    return this.record.customData;
  }

  get createdAt(): number {
    return this.record.createdAt;
  }

  get updatedAt(): number {
    return this.record.updatedAt;
  }

  // ==================== Static Factory Methods ====================

  /**
   * Create a new image (conversation)
   */
  static async create(config: ImageCreateConfig, context: ImageContext): Promise<ImageImpl> {
    const now = Date.now();
    const imageId = ImageImpl.generateImageId();
    const sessionId = ImageImpl.generateSessionId();
    const osId = ImageImpl.generateOsId();

    // Create image record
    const record: ImageRecord = {
      imageId,
      containerId: config.containerId,
      sessionId,
      osId,
      name: config.name ?? "New Conversation",
      description: config.description,
      roleId: config.roleId,
      model: config.model,
      systemPrompt: config.systemPrompt,
      mcpServers: config.mcpServers,
      thinking: config.thinking,
      providerOptions: config.providerOptions,
      customData: config.customData,
      createdAt: now,
      updatedAt: now,
    };

    // Persist image
    await context.imageRepository.saveImage(record);

    // Create associated session (for message storage)
    await context.sessionRepository.saveSession({
      sessionId,
      imageId,
      containerId: config.containerId,
      createdAt: now,
      updatedAt: now,
    });

    logger.info("Image created", {
      imageId,
      sessionId,
      containerId: config.containerId,
      name: record.name,
    });

    return new ImageImpl(record, context);
  }

  /**
   * Load an existing image from storage
   */
  static async load(imageId: string, context: ImageContext): Promise<ImageImpl | null> {
    const record = await context.imageRepository.findImageById(imageId);
    if (!record) {
      logger.debug("Image not found", { imageId });
      return null;
    }

    logger.debug("Image loaded", { imageId, name: record.name });
    return new ImageImpl(record, context);
  }

  /**
   * List all images in a container
   */
  static async listByContainer(containerId: string, context: ImageContext): Promise<ImageRecord[]> {
    return context.imageRepository.findImagesByContainerId(containerId);
  }

  /**
   * List all images
   */
  static async listAll(context: ImageContext): Promise<ImageRecord[]> {
    return context.imageRepository.findAllImages();
  }

  // ==================== Instance Methods ====================

  /**
   * Update image metadata
   */
  async update(updates: {
    name?: string;
    description?: string;
    model?: string;
    systemPrompt?: string;
    mcpServers?: Record<string, McpServerConfig>;
    thinking?: "disabled" | "low" | "medium" | "high";
    providerOptions?: Record<string, unknown>;
    customData?: Record<string, unknown>;
  }): Promise<Image> {
    const now = Date.now();
    const updatedRecord: ImageRecord = {
      ...this.record,
      name: updates.name ?? this.record.name,
      description: updates.description ?? this.record.description,
      model: updates.model !== undefined ? updates.model : this.record.model,
      systemPrompt:
        updates.systemPrompt !== undefined ? updates.systemPrompt : this.record.systemPrompt,
      mcpServers: updates.mcpServers !== undefined ? updates.mcpServers : this.record.mcpServers,
      thinking: updates.thinking !== undefined ? updates.thinking : this.record.thinking,
      providerOptions:
        updates.providerOptions !== undefined
          ? updates.providerOptions
          : this.record.providerOptions,
      customData: updates.customData !== undefined ? updates.customData : this.record.customData,
      updatedAt: now,
    };

    await this.context.imageRepository.saveImage(updatedRecord);

    logger.info("Image updated", { imageId: this.imageId, updates });
    return new ImageImpl(updatedRecord, this.context);
  }

  /**
   * Delete this image and its session
   */
  async delete(): Promise<void> {
    // Delete session first (including messages)
    await this.context.sessionRepository.deleteSession(this.sessionId);

    // Delete image
    await this.context.imageRepository.deleteImage(this.imageId);

    logger.info("Image deleted", { imageId: this.imageId, sessionId: this.sessionId });
  }

  /**
   * Get the underlying record
   */
  toRecord(): ImageRecord {
    return { ...this.record };
  }

  // ==================== Private Helpers ====================

  private static generateImageId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `img_${timestamp}_${random}`;
  }

  private static generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `sess_${timestamp}_${random}`;
  }

  private static generateOsId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `os_${timestamp}_${random}`;
  }
}

/**
 * Create a new Image
 */
export async function createImage(
  config: ImageCreateConfig,
  context: ImageContext
): Promise<Image> {
  return ImageImpl.create(config, context);
}

/**
 * Load an existing Image
 */
export async function loadImage(imageId: string, context: ImageContext): Promise<Image | null> {
  return ImageImpl.load(imageId, context);
}
