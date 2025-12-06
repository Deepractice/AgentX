/**
 * ImagePane - Saved conversations list
 *
 * Displays a list of saved conversation snapshots (Images).
 * Users can:
 * - Click to resume a conversation
 * - Delete saved conversations
 * - Create new conversations
 */

import type { ImageItem } from "./types";
import { cn } from "~/utils";

export interface ImagePaneProps {
  /**
   * List of saved images
   */
  images: ImageItem[];

  /**
   * Currently selected image ID
   */
  selectedImageId?: string | null;

  /**
   * Loading state
   */
  isLoading?: boolean;

  /**
   * Callback when an image is selected (to resume)
   */
  onSelectImage?: (image: ImageItem) => void;

  /**
   * Callback when delete is clicked
   */
  onDeleteImage?: (imageId: string) => void;

  /**
   * Callback when new conversation is requested
   */
  onNewConversation?: () => void;

  /**
   * Additional class name
   */
  className?: string;
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

/**
 * Single image item component
 */
function ImageListItem({
  image,
  isSelected,
  onSelect,
  onDelete,
}: {
  image: ImageItem;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-1 px-3 py-2 cursor-pointer rounded-lg transition-colors",
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
          : "hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent"
      )}
      onClick={onSelect}
    >
      {/* Title */}
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
          {image.name || "Untitled"}
        </span>
        {image.isActive && (
          <span className="w-2 h-2 bg-green-500 rounded-full ml-2" title="Active" />
        )}
      </div>

      {/* Preview */}
      {image.preview && (
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {image.preview}
        </p>
      )}

      {/* Timestamp */}
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {formatRelativeTime(image.createdAt)}
      </span>

      {/* Delete button (shown on hover) */}
      <button
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete"
      >
        <svg
          className="w-4 h-4 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}

/**
 * ImagePane component
 */
export function ImagePane({
  images,
  selectedImageId,
  isLoading,
  onSelectImage,
  onDeleteImage,
  onNewConversation,
  className,
}: ImagePaneProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Conversations
        </h2>
        <button
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={onNewConversation}
          title="New conversation"
        >
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      {/* Image list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
            <svg
              className="w-12 h-12 mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm">No conversations yet</p>
            <button
              className="mt-2 text-sm text-blue-500 hover:text-blue-600"
              onClick={onNewConversation}
            >
              Start a new one
            </button>
          </div>
        ) : (
          images.map((image) => (
            <ImageListItem
              key={image.imageId}
              image={image}
              isSelected={selectedImageId === image.imageId}
              onSelect={() => onSelectImage?.(image)}
              onDelete={() => onDeleteImage?.(image.imageId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
