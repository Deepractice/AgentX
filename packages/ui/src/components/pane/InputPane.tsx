/**
 * InputPane - Full-height input area with attachment support (WeChat style)
 *
 * A pure UI component where the entire pane is an input area:
 * - Toolbar at the top
 * - Attachment preview area (when attachments exist)
 * - Full-height textarea filling the space
 * - Send button at bottom right corner
 *
 * Supports:
 * - Text input
 * - Image/file attachments via toolbar buttons
 * - Drag & drop files
 * - Paste images (Ctrl+V)
 *
 * @example
 * ```tsx
 * <InputPane
 *   onSend={(content) => handleSend(content)}
 *   placeholder="Type a message..."
 *   toolbarItems={[
 *     { id: 'emoji', icon: <Smile />, label: 'Emoji' },
 *     { id: 'image', icon: <Image />, label: 'Add image' },
 *     { id: 'attach', icon: <Paperclip />, label: 'Attach file' },
 *   ]}
 * />
 * ```
 */

import * as React from "react";
import { Send, Square, X } from "lucide-react";
import { cn } from "~/utils/utils";
import { InputToolBar, type ToolBarItem } from "./InputToolBar";
import { EmojiPicker, type Emoji } from "../element/EmojiPicker";
import { ImageAttachment } from "../element/ImageAttachment";

/**
 * Content part types for multimodal messages
 */
interface TextPart {
  type: "text";
  text: string;
}

interface ImagePart {
  type: "image";
  data: string;
  mediaType: string;
  name?: string;
}

interface FilePart {
  type: "file";
  data: string;
  mediaType: string;
  filename?: string;
}

type UserContentPart = TextPart | ImagePart | FilePart;

/**
 * Internal attachment representation
 */
interface Attachment {
  id: string;
  file: File;
  type: "image" | "file";
  preview?: string;
  error?: string;
}

export interface InputPaneProps {
  /**
   * Callback when user sends a message
   * Returns string for text-only, or ContentPart[] for multimodal
   */
  onSend?: (content: string | UserContentPart[]) => void;
  /**
   * Callback when stop button is clicked (during loading)
   */
  onStop?: () => void;
  /**
   * Whether the input is disabled
   */
  disabled?: boolean;
  /**
   * Whether currently loading/processing
   */
  isLoading?: boolean;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Toolbar items (left side)
   */
  toolbarItems?: ToolBarItem[];
  /**
   * Toolbar items (right side)
   */
  toolbarRightItems?: ToolBarItem[];
  /**
   * Callback when a toolbar item is clicked
   */
  onToolbarItemClick?: (id: string) => void;
  /**
   * Show toolbar
   * @default true when toolbarItems provided
   */
  showToolbar?: boolean;
  /**
   * Additional class name
   */
  className?: string;
  /**
   * Enable built-in emoji picker for toolbar item with id='emoji'
   * @default true
   */
  enableEmojiPicker?: boolean;
  /**
   * Enable attachment support for toolbar items with id='image', 'attach', 'folder'
   * @default true
   */
  enableAttachments?: boolean;
  /**
   * Maximum number of attachments
   * @default 10
   */
  maxAttachments?: number;
  /**
   * Maximum file size in bytes
   * @default 5242880 (5MB)
   */
  maxFileSize?: number;
  /**
   * Accepted image types
   * @default ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
   */
  acceptedImageTypes?: string[];
  /**
   * Accepted file types (for non-image attachments)
   * @default ['application/pdf']
   */
  acceptedFileTypes?: string[];
}

/**
 * Convert File to base64
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix to get raw base64
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * InputPane component - WeChat style full-height input with attachments
 */
export const InputPane = React.forwardRef<HTMLDivElement, InputPaneProps>(
  (
    {
      onSend,
      onStop,
      disabled = false,
      isLoading = false,
      placeholder = "Type a message...",
      toolbarItems,
      toolbarRightItems,
      onToolbarItemClick,
      showToolbar,
      className,
      enableEmojiPicker = true,
      enableAttachments = true,
      maxAttachments = 10,
      maxFileSize = 5 * 1024 * 1024, // 5MB
      acceptedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"],
      acceptedFileTypes = ["application/pdf"],
    },
    ref
  ) => {
    const [text, setText] = React.useState("");
    const [attachments, setAttachments] = React.useState<Attachment[]>([]);
    const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);

    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const emojiPickerRef = React.useRef<HTMLDivElement>(null);
    const imageInputRef = React.useRef<HTMLInputElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // All accepted types
    const allAcceptedTypes = React.useMemo(
      () => [...acceptedImageTypes, ...acceptedFileTypes],
      [acceptedImageTypes, acceptedFileTypes]
    );

    // Close emoji picker when clicking outside
    React.useEffect(() => {
      if (!showEmojiPicker) return;

      const handleClickOutside = (e: MouseEvent) => {
        if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
          setShowEmojiPicker(false);
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setShowEmojiPicker(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }, [showEmojiPicker]);

    /**
     * Add files as attachments
     */
    const addFiles = React.useCallback(
      async (files: Iterable<File>) => {
        const fileArray = Array.from(files);

        for (const file of fileArray) {
          // Check max attachments
          if (attachments.length >= maxAttachments) {
            console.warn(`Maximum ${maxAttachments} attachments allowed`);
            break;
          }

          // Check file type
          if (!allAcceptedTypes.includes(file.type)) {
            console.warn(`File type ${file.type} not accepted`);
            continue;
          }

          // Check file size
          if (file.size > maxFileSize) {
            console.warn(`File ${file.name} exceeds maximum size of ${maxFileSize} bytes`);
            continue;
          }

          const isImage = acceptedImageTypes.includes(file.type);
          const attachment: Attachment = {
            id: generateId(),
            file,
            type: isImage ? "image" : "file",
          };

          // Generate preview for images
          if (isImage) {
            const reader = new FileReader();
            reader.onload = () => {
              setAttachments((prev) =>
                prev.map((a) =>
                  a.id === attachment.id ? { ...a, preview: reader.result as string } : a
                )
              );
            };
            reader.readAsDataURL(file);
          }

          setAttachments((prev) => [...prev, attachment]);
        }
      },
      [attachments.length, maxAttachments, maxFileSize, allAcceptedTypes, acceptedImageTypes]
    );

    /**
     * Remove attachment
     */
    const removeAttachment = React.useCallback((id: string) => {
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    }, []);

    /**
     * Handle send
     */
    const handleSend = React.useCallback(async () => {
      const trimmedText = text.trim();
      if ((!trimmedText && attachments.length === 0) || disabled || isLoading) return;

      // Text only - send as string
      if (attachments.length === 0) {
        onSend?.(trimmedText);
        setText("");
        return;
      }

      // With attachments - build ContentPart[]
      const parts: UserContentPart[] = [];

      // Add text part if present
      if (trimmedText) {
        parts.push({ type: "text", text: trimmedText });
      }

      // Add attachment parts
      for (const attachment of attachments) {
        try {
          const base64 = await fileToBase64(attachment.file);

          if (attachment.type === "image") {
            parts.push({
              type: "image",
              data: base64,
              mediaType: attachment.file.type,
              name: attachment.file.name,
            });
          } else {
            parts.push({
              type: "file",
              data: base64,
              mediaType: attachment.file.type,
              filename: attachment.file.name,
            });
          }
        } catch (error) {
          console.error(`Failed to read file ${attachment.file.name}:`, error);
        }
      }

      if (parts.length > 0) {
        onSend?.(parts);
        setText("");
        setAttachments([]);
      }
    }, [text, attachments, disabled, isLoading, onSend]);

    /**
     * Handle keyboard
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSend();
      }
    };

    /**
     * Handle paste (for images)
     */
    const handlePaste = React.useCallback(
      (e: React.ClipboardEvent) => {
        if (!enableAttachments) return;

        const items = e.clipboardData?.items;
        if (!items) return;

        const imageFiles: File[] = [];
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              imageFiles.push(file);
            }
          }
        }

        if (imageFiles.length > 0) {
          e.preventDefault();
          addFiles(imageFiles);
        }
      },
      [enableAttachments, addFiles]
    );

    /**
     * Handle drag events
     */
    const handleDragOver = React.useCallback(
      (e: React.DragEvent) => {
        if (!enableAttachments) return;
        e.preventDefault();
        setIsDragging(true);
      },
      [enableAttachments]
    );

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    }, []);

    const handleDrop = React.useCallback(
      (e: React.DragEvent) => {
        if (!enableAttachments) return;
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          addFiles(files);
        }
      },
      [enableAttachments, addFiles]
    );

    /**
     * Handle emoji select
     */
    const handleEmojiSelect = (emoji: Emoji) => {
      setText((prev) => prev + emoji.native);
      setShowEmojiPicker(false);
      textareaRef.current?.focus();
    };

    /**
     * Handle toolbar item click
     */
    const handleToolbarItemClick = (id: string) => {
      if (id === "emoji" && enableEmojiPicker) {
        setShowEmojiPicker((prev) => !prev);
      }

      // Handle attachment buttons
      if (enableAttachments) {
        if (id === "image") {
          imageInputRef.current?.click();
        } else if (id === "attach" || id === "folder") {
          fileInputRef.current?.click();
        }
      }

      onToolbarItemClick?.(id);
    };

    /**
     * Handle file input change
     */
    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        addFiles(files);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    };

    // Check if toolbar has emoji item
    const hasEmojiItem =
      toolbarItems?.some((item) => item.id === "emoji") ||
      toolbarRightItems?.some((item) => item.id === "emoji");

    const shouldShowToolbar = showToolbar ?? (toolbarItems && toolbarItems.length > 0);

    const canSend = (text.trim().length > 0 || attachments.length > 0) && !disabled && !isLoading;

    return (
      <div
        ref={ref}
        className={cn("flex flex-col h-full border-t border-border bg-muted/30", className)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept={acceptedImageTypes.join(",")}
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={allAcceptedTypes.join(",")}
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Toolbar at top */}
        {shouldShowToolbar && (
          <div className="flex-shrink-0 border-b border-border relative">
            <InputToolBar
              items={toolbarItems || []}
              rightItems={toolbarRightItems}
              onItemClick={handleToolbarItemClick}
            />
            {/* Emoji Picker Popover */}
            {enableEmojiPicker && hasEmojiItem && showEmojiPicker && (
              <div ref={emojiPickerRef} className="absolute left-0 bottom-full z-50 mb-1">
                <div
                  className="bg-popover rounded-lg shadow-lg border border-border"
                  onClick={(e) => e.stopPropagation()}
                >
                  <EmojiPicker onEmojiSelect={handleEmojiSelect} theme="auto" perLine={8} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Attachment preview area */}
        {attachments.length > 0 && (
          <div className="flex-shrink-0 px-3 py-2 border-b border-border">
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment) =>
                attachment.type === "image" ? (
                  <ImageAttachment
                    key={attachment.id}
                    file={attachment.file}
                    onRemove={() => removeAttachment(attachment.id)}
                    error={attachment.error}
                  />
                ) : (
                  <div
                    key={attachment.id}
                    className="relative group flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/50"
                  >
                    <span className="text-sm truncate max-w-32">{attachment.file.name}</span>
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      className="p-0.5 rounded-full bg-destructive text-white hover:bg-destructive/90"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg">
            <p className="text-primary font-medium">Drop files here</p>
          </div>
        )}

        {/* Full-height textarea area */}
        <div className="flex-1 relative min-h-0">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "w-full h-full resize-none bg-transparent",
              "px-3 py-3 pr-14 text-sm",
              "placeholder:text-muted-foreground",
              "focus:outline-none",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "overflow-y-auto"
            )}
          />

          {/* Send/Stop button at bottom right */}
          <div className="absolute bottom-3 right-3">
            {isLoading && onStop ? (
              <button
                type="button"
                onClick={onStop}
                className={cn(
                  "p-2 rounded-lg transition-all duration-150",
                  "bg-destructive text-destructive-foreground",
                  "hover:bg-destructive/90",
                  "active:scale-95"
                )}
                title="Stop"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className={cn(
                  "p-2 rounded-lg transition-all duration-150",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90",
                  "active:scale-95",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                title="Send (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

InputPane.displayName = "InputPane";
