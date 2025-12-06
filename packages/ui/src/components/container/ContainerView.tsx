/**
 * ContainerView - Main container component
 *
 * Combines ImagePane (sidebar) and ChatPane (main area).
 * Manages the conversation state and coordinates between components.
 *
 * New architecture:
 * - Agent instance = one conversation (short-lived)
 * - Image = saved conversation snapshot (persistent)
 *
 * Layout:
 * ```
 * ┌─────────────┬───────────────────────────────────┐
 * │             │                                   │
 * │  ImagePane  │          ChatPane                 │
 * │  (sidebar)  │                                   │
 * │             │  ┌─────────────────────────────┐  │
 * │  [Images]   │  │      Messages               │  │
 * │             │  └─────────────────────────────┘  │
 * │             │  ┌─────────────────────────────┐  │
 * │  [+ New]    │  │      Input                  │  │
 * │             │  └─────────────────────────────┘  │
 * └─────────────┴───────────────────────────────────┘
 * ```
 */

import React from "react";
import type { AgentX } from "agentxjs";
import { useAgent, useImages } from "~/hooks";
import { ImagePane } from "./ImagePane";
import { ChatPane } from "./ChatPane";
import type { ImageItem } from "./types";
import { cn } from "~/utils";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("ui/ContainerView");

export interface ContainerViewProps {
  /**
   * AgentX instance
   */
  agentx: AgentX;

  /**
   * Container ID for creating new agents
   */
  containerId: string;

  /**
   * Default agent config for new conversations
   */
  defaultAgentConfig?: {
    name: string;
    systemPrompt?: string;
  };

  /**
   * Additional class name
   */
  className?: string;
}

/**
 * ContainerView component
 */
export function ContainerView({
  agentx,
  containerId,
  defaultAgentConfig = { name: "Assistant" },
  className,
}: ContainerViewProps) {
  // Current agent state
  const [currentAgentId, setCurrentAgentId] = React.useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = React.useState<string | null>(null);

  // Images hook
  const {
    images,
    isLoading: imagesLoading,
    refresh: refreshImages,
    resumeImage,
    deleteImage,
    snapshotAgent,
  } = useImages(agentx, {
    onResume: (agentId) => {
      setCurrentAgentId(agentId);
    },
  });

  // Agent hook
  const {
    messages,
    streaming,
    status,
    isLoading: agentLoading,
    send,
    interrupt,
    clearMessages,
  } = useAgent(agentx, currentAgentId);

  // Convert ImageRecord[] to ImageItem[]
  const imageItems: ImageItem[] = React.useMemo(() => {
    return images.map((img) => ({
      ...img,
      preview: img.messages.length > 0
        ? String((img.messages[img.messages.length - 1] as { content?: string })?.content || "").slice(0, 50)
        : undefined,
      isActive: img.agentId === currentAgentId,
    }));
  }, [images, currentAgentId]);

  // Handle selecting an image (resume conversation)
  const handleSelectImage = async (image: ImageItem) => {
    try {
      setSelectedImageId(image.imageId);
      const { agentId } = await resumeImage(image.imageId);
      setCurrentAgentId(agentId);
      logger.info("Resumed conversation", { imageId: image.imageId, agentId });
    } catch (error) {
      logger.error("Failed to resume conversation", { error });
      setSelectedImageId(null);
    }
  };

  // Handle deleting an image
  const handleDeleteImage = async (imageId: string) => {
    try {
      await deleteImage(imageId);
      if (selectedImageId === imageId) {
        setSelectedImageId(null);
        setCurrentAgentId(null);
        clearMessages();
      }
      logger.info("Deleted conversation", { imageId });
    } catch (error) {
      logger.error("Failed to delete conversation", { error });
    }
  };

  // Handle creating a new conversation
  const handleNewConversation = async () => {
    try {
      // Create a new agent
      const response = await agentx.request("agent_run_request", {
        containerId,
        config: defaultAgentConfig,
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const { agentId } = response.data;
      if (agentId) {
        setCurrentAgentId(agentId);
        setSelectedImageId(null);
        clearMessages();
        logger.info("Created new conversation", { agentId });
      }
    } catch (error) {
      logger.error("Failed to create new conversation", { error });
    }
  };

  // Handle saving current conversation
  const handleSaveConversation = async () => {
    if (!currentAgentId) return;

    try {
      const record = await snapshotAgent(currentAgentId);
      setSelectedImageId(record.imageId);
      await refreshImages();
      logger.info("Saved conversation", { imageId: record.imageId });
    } catch (error) {
      logger.error("Failed to save conversation", { error });
    }
  };

  return (
    <div className={cn("flex h-full", className)}>
      {/* Sidebar - Image list */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <ImagePane
          images={imageItems}
          selectedImageId={selectedImageId}
          isLoading={imagesLoading}
          onSelectImage={handleSelectImage}
          onDeleteImage={handleDeleteImage}
          onNewConversation={handleNewConversation}
        />
      </div>

      {/* Main area - Chat */}
      <div className="flex-1 bg-white dark:bg-gray-800">
        {currentAgentId ? (
          <ChatPane
            messages={messages}
            streaming={streaming}
            status={status}
            isLoading={agentLoading}
            onSend={send}
            onInterrupt={interrupt}
            onSave={handleSaveConversation}
            agentName={defaultAgentConfig.name}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <svg
              className="w-20 h-20 mb-4 opacity-30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-lg font-medium mb-2">No conversation selected</p>
            <p className="text-sm mb-4">Select a conversation or start a new one</p>
            <button
              onClick={handleNewConversation}
              className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              New Conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export types
export type { ImageItem, ConversationState } from "./types";
