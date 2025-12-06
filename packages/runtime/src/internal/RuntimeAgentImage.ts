/**
 * RuntimeAgentImage - AgentImage implementation with resume capability
 *
 * AgentImage is an object with behavior. It can restore itself to a running Agent.
 */

import type { Agent, AgentImage, ImageMessage } from "@agentxjs/types/runtime";
import type { ImageRepository } from "@agentxjs/types/persistence";
import type { Message } from "@agentxjs/types/agent";
import { RuntimeAgent } from "./RuntimeAgent";

/**
 * Context needed by RuntimeAgentImage to perform resume
 */
export interface RuntimeImageContext {
  /**
   * Create an agent in a container with initial messages
   */
  createAgentWithMessages(
    containerId: string,
    config: { name: string; description?: string; systemPrompt?: string },
    messages: Message[]
  ): Promise<Agent>;

  /**
   * Image repository for persistence
   */
  imageRepository: ImageRepository;
}

/**
 * Data fields for creating RuntimeAgentImage
 */
export interface RuntimeAgentImageData {
  imageId: string;
  containerId: string;
  agentId: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  messages: ImageMessage[];
  parentImageId?: string;
  createdAt: number;
}

/**
 * RuntimeAgentImage - AgentImage with resume() behavior
 */
export class RuntimeAgentImage implements AgentImage {
  readonly imageId: string;
  readonly containerId: string;
  readonly agentId: string;
  readonly name: string;
  readonly description?: string;
  readonly systemPrompt?: string;
  readonly messages: ImageMessage[];
  readonly parentImageId?: string;
  readonly createdAt: number;

  private readonly context: RuntimeImageContext;

  constructor(data: RuntimeAgentImageData, context: RuntimeImageContext) {
    this.imageId = data.imageId;
    this.containerId = data.containerId;
    this.agentId = data.agentId;
    this.name = data.name;
    this.description = data.description;
    this.systemPrompt = data.systemPrompt;
    this.messages = data.messages;
    this.parentImageId = data.parentImageId;
    this.createdAt = data.createdAt;
    this.context = context;
  }

  /**
   * Create a snapshot from a running agent
   */
  static async snapshot(
    agent: RuntimeAgent,
    context: RuntimeImageContext
  ): Promise<RuntimeAgentImage> {
    // Get messages from session
    const messages = await agent.session.getMessages();

    // Generate image ID
    const imageId = RuntimeAgentImage.generateImageId();
    const now = Date.now();

    // Create image data
    const data: RuntimeAgentImageData = {
      imageId,
      containerId: agent.containerId,
      agentId: agent.agentId,
      name: agent.name,
      description: agent.config.description,
      systemPrompt: agent.config.systemPrompt,
      messages: messages as ImageMessage[],
      createdAt: now,
    };

    // Persist to repository
    await context.imageRepository.saveImage({
      imageId,
      containerId: agent.containerId,
      agentId: agent.agentId,
      name: agent.name,
      description: agent.config.description,
      systemPrompt: agent.config.systemPrompt,
      messages: messages as unknown as Record<string, unknown>[],
      createdAt: now,
    });

    return new RuntimeAgentImage(data, context);
  }

  /**
   * Resume an agent from this image
   */
  async resume(): Promise<Agent> {
    return this.context.createAgentWithMessages(
      this.containerId,
      {
        name: this.name,
        description: this.description,
        systemPrompt: this.systemPrompt,
      },
      this.messages as Message[]
    );
  }

  /**
   * Generate unique image ID
   */
  private static generateImageId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `img_${timestamp}_${random}`;
  }
}
