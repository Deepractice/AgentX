# Issue 038: Multimodal Content Support (Images & Files)

**Status**: Open
**Priority**: High
**Created**: 2025-12-17
**Related**: Claude API Vision, PDF Support

## Overview

This issue tracks the implementation of multimodal content support in AgentX, enabling users to send images and files (PDF, etc.) to AI agents. Currently, AgentX has type definitions for `ImagePart` and `FilePart`, but the actual implementation chain is broken - all non-text content is discarded before reaching the Claude API.

### Current State

```
Types Layer    ████████████ 100%  - ImagePart, FilePart defined
Agent Layer    ████████░░░░  70%  - receive() accepts UserMessage, but content lost downstream
Runtime Layer  ██░░░░░░░░░░  15%  - buildSDKUserMessage() only extracts text
UI Layer       ██░░░░░░░░░░  15%  - ImageAttachment exists but not integrated
API Layer      ░░░░░░░░░░░░   0%  - No file upload endpoints
```

### Goal

Enable end-to-end multimodal message flow:

```
User uploads image/file → InputPane → agent.receive() → Claude API → Response → MessageContent renders
```

---

## Phase 1: Runtime Layer (Core Fix)

### Task 1.1: Update Type Definitions

**Files**: `packages/types/src/agent/message/parts/`

Current AgentX types don't match Claude API format. Need to either:

- Option A: Update types to match Claude API directly
- Option B: Keep current types and add transformation layer

**Claude API Format**:

```typescript
// Image
{
  type: "image",
  source: {
    type: "base64" | "url",
    media_type: "image/jpeg",
    data: "base64..."  // or url: "https://..."
  }
}

// Document (PDF)
{
  type: "document",
  source: {
    type: "base64" | "url",
    media_type: "application/pdf",
    data: "base64..."
  }
}
```

**Current AgentX Format**:

```typescript
// ImagePart
{
  type: "image",
  data: string,
  mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp",
  name?: string
}

// FilePart
{
  type: "file",
  data: string,
  mediaType: string,
  filename?: string
}
```

**Checklist**:

- [ ] Decide on approach (update types vs transformation layer)
- [ ] Update `ImagePart.ts` if needed
- [ ] Update `FilePart.ts` if needed
- [ ] Add `DocumentPart.ts` for PDF support (Claude uses "document" type)
- [ ] Update `ContentPart` union type
- [ ] Add source type discrimination (`base64` | `url`)

---

### Task 1.2: Fix buildSDKUserMessage()

**File**: `packages/runtime/src/environment/helpers.ts`

This is the critical fix. Current implementation discards all non-text content:

```typescript
// CURRENT (broken)
export function buildPrompt(message: UserMessage): string {
  return message.content
    .filter((part) => part.type === "text") // ← Discards images/files!
    .map((part) => part.text)
    .join("\n");
}

export function buildSDKUserMessage(message: UserMessage, sessionId: string): SDKUserMessage {
  return {
    type: "user",
    message: { role: "user", content: buildPrompt(message) }, // ← Only text string
    parent_tool_use_id: null,
    session_id: sessionId,
  };
}
```

**Required Implementation**:

```typescript
// NEW (multimodal support)
type ClaudeContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: string; data: string } };

export function buildSDKContent(message: UserMessage): string | ClaudeContentBlock[] {
  if (typeof message.content === "string") {
    return message.content;
  }

  if (!Array.isArray(message.content)) {
    return "";
  }

  // Check if we have only text parts
  const hasNonTextParts = message.content.some((p) => p.type !== "text");

  if (!hasNonTextParts) {
    // Pure text - return as string for efficiency
    return message.content
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n");
  }

  // Mixed content - return as content blocks
  return message.content.map((part) => {
    switch (part.type) {
      case "text":
        return { type: "text", text: part.text };

      case "image":
        return {
          type: "image",
          source: {
            type: "base64",
            media_type: part.mediaType,
            data: part.data,
          },
        };

      case "file":
        // PDF files use "document" type in Claude API
        if (part.mediaType === "application/pdf") {
          return {
            type: "document",
            source: {
              type: "base64",
              media_type: part.mediaType,
              data: part.data,
            },
          };
        }
        // Other files - may need different handling
        return {
          type: "document",
          source: {
            type: "base64",
            media_type: part.mediaType,
            data: part.data,
          },
        };

      default:
        return { type: "text", text: "" };
    }
  });
}

export function buildSDKUserMessage(message: UserMessage, sessionId: string): SDKUserMessage {
  return {
    type: "user",
    message: { role: "user", content: buildSDKContent(message) },
    parent_tool_use_id: null,
    session_id: sessionId,
  };
}
```

**Checklist**:

- [ ] Add `ClaudeContentBlock` type definitions
- [ ] Implement `buildSDKContent()` function
- [ ] Update `buildSDKUserMessage()` to use new function
- [ ] Add unit tests for text-only messages
- [ ] Add unit tests for image messages
- [ ] Add unit tests for PDF messages
- [ ] Add unit tests for mixed content messages

---

### Task 1.3: Verify Agent.receive() Flow

**File**: `packages/agent/src/createAgent.ts`

Verify that `receive()` correctly passes `UserMessage` objects through the pipeline.

**Checklist**:

- [ ] Verify `receive(message: string | UserMessage)` signature
- [ ] Ensure `UserMessage` with `ContentPart[]` flows through unchanged
- [ ] Add integration test with multimodal UserMessage

---

## Phase 2: UI Components - Message Display

### Task 2.1: Create ImageBlock Component

**File**: `packages/ui/src/components/message/ImageBlock.tsx` (new)

Display images within message content.

```typescript
interface ImageBlockProps {
  src: string; // base64 data or URL
  alt?: string;
  mediaType?: string;
  className?: string;
}
```

**Features**:

- [ ] Display image with proper sizing
- [ ] Click to enlarge (lightbox/modal)
- [ ] Loading state
- [ ] Error state (broken image)
- [ ] Lazy loading for performance

---

### Task 2.2: Create FileBlock Component

**File**: `packages/ui/src/components/message/FileBlock.tsx` (new)

Display file attachments as cards within message content.

```typescript
interface FileBlockProps {
  filename?: string;
  mediaType: string;
  data: string; // base64 data
  size?: number; // file size in bytes
  className?: string;
}
```

**Features**:

- [ ] File type icon based on mediaType
- [ ] Filename display
- [ ] File size display
- [ ] Download button
- [ ] PDF inline preview (optional, Phase 3)

---

### Task 2.3: Update MessageContent Component

**File**: `packages/ui/src/components/message/MessageContent.tsx`

Current implementation only extracts text. Need to render all content types.

```typescript
// CURRENT
const extractTextFromContentParts = (content: unknown): string | null => {
  const textParts = content.filter(p => p.type === "text");
  return textParts.map(p => p.text).join("\n");
};

// NEW - render all parts
const renderContentParts = (parts: ContentPart[]) => {
  return parts.map((part, index) => {
    switch (part.type) {
      case "text":
        return <MarkdownText key={index}>{part.text}</MarkdownText>;
      case "image":
        return <ImageBlock key={index} src={part.data} mediaType={part.mediaType} alt={part.name} />;
      case "file":
        return <FileBlock key={index} data={part.data} mediaType={part.mediaType} filename={part.filename} />;
      default:
        return null;
    }
  });
};
```

**Checklist**:

- [ ] Import ImageBlock and FileBlock components
- [ ] Replace `extractTextFromContentParts` with `renderContentParts`
- [ ] Handle mixed content layout (text + images + files)
- [ ] Add Storybook stories for multimodal messages
- [ ] Test with various content combinations

---

## Phase 3: UI Components - Input & Upload

### Task 3.1: Create AttachmentList Component

**File**: `packages/ui/src/components/element/AttachmentList.tsx` (new)

Container for displaying pending attachments before sending.

```typescript
interface Attachment {
  id: string;
  file: File;
  type: "image" | "file";
  preview?: string; // base64 preview for images
  uploadProgress?: number;
  error?: string;
}

interface AttachmentListProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
  className?: string;
}
```

**Checklist**:

- [ ] Create component with horizontal scroll layout
- [ ] Use existing `ImageAttachment` for images
- [ ] Create `FileAttachment` for non-image files
- [ ] Support remove action for each item
- [ ] Show upload progress if applicable

---

### Task 3.2: Create FileAttachment Component

**File**: `packages/ui/src/components/element/FileAttachment.tsx` (new)

Similar to `ImageAttachment` but for non-image files.

```typescript
interface FileAttachmentProps {
  file: File;
  onRemove: () => void;
  uploadProgress?: number;
  error?: string;
  className?: string;
}
```

**Features**:

- [ ] File icon based on type
- [ ] Filename (truncated if long)
- [ ] File size
- [ ] Remove button
- [ ] Progress overlay
- [ ] Error state

---

### Task 3.3: Update InputPane Component

**File**: `packages/ui/src/components/pane/InputPane.tsx`

Major update to support attachments.

**Interface Changes**:

```typescript
interface InputPaneProps {
  // Existing
  onSend?: (text: string) => void;

  // NEW - Option A: Simple callback change
  onSend?: (content: string | ContentPart[]) => void;

  // NEW - Option B: Separate callbacks
  onSendText?: (text: string) => void;
  onSendMultimodal?: (parts: ContentPart[]) => void;

  // NEW - Attachment management (controlled component)
  attachments?: Attachment[];
  onAttachmentsChange?: (attachments: Attachment[]) => void;

  // NEW - Configuration
  maxAttachments?: number; // default: 10
  maxFileSize?: number; // default: 5MB (Claude limit)
  acceptedImageTypes?: string[]; // default: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  acceptedFileTypes?: string[]; // default: ['application/pdf']
  enableDragDrop?: boolean; // default: true
  enablePaste?: boolean; // default: true
}
```

**Features**:

- [ ] Add attachment button to toolbar
- [ ] File input (hidden) triggered by button
- [ ] Drag & drop zone overlay
- [ ] Paste image support (Ctrl+V / Cmd+V)
- [ ] Attachment preview area above textarea
- [ ] Convert attachments to ContentPart[] on send
- [ ] File size validation
- [ ] File type validation
- [ ] Max attachments validation

**Implementation Steps**:

- [ ] Add state for attachments (if uncontrolled)
- [ ] Add hidden file input element
- [ ] Add drag & drop event handlers
- [ ] Add paste event handler
- [ ] Add attachment preview section (AttachmentList)
- [ ] Update send logic to build ContentPart[]
- [ ] Add file validation utilities
- [ ] Update Storybook stories

---

### Task 3.4: File Processing Utilities

**File**: `packages/ui/src/utils/fileUtils.ts` (new)

Utility functions for file handling.

```typescript
// Convert File to base64
export async function fileToBase64(file: File): Promise<string>;

// Get file type category
export function getFileCategory(file: File): "image" | "pdf" | "document" | "other";

// Validate file
export function validateFile(file: File, options: ValidationOptions): ValidationResult;

// Generate unique attachment ID
export function generateAttachmentId(): string;

// Convert Attachment[] to ContentPart[]
export function attachmentsToContentParts(attachments: Attachment[], text: string): ContentPart[];
```

**Checklist**:

- [ ] Implement fileToBase64()
- [ ] Implement getFileCategory()
- [ ] Implement validateFile()
- [ ] Implement generateAttachmentId()
- [ ] Implement attachmentsToContentParts()
- [ ] Add unit tests

---

## Phase 4: Integration & Testing

### Task 4.1: End-to-End Integration Test

**Checklist**:

- [ ] Test image upload flow in portagent app
- [ ] Test PDF upload flow in portagent app
- [ ] Test mixed content (text + images + files)
- [ ] Verify Claude API receives correct format
- [ ] Verify response displays correctly

---

### Task 4.2: Storybook Stories

**File**: `packages/ui/src/components/**/*.stories.tsx`

**Checklist**:

- [ ] ImageBlock stories (various sizes, states)
- [ ] FileBlock stories (various file types)
- [ ] MessageContent stories (multimodal messages)
- [ ] AttachmentList stories
- [ ] FileAttachment stories
- [ ] InputPane stories (with attachments)

---

### Task 4.3: Documentation

**Checklist**:

- [ ] Update README with multimodal usage examples
- [ ] Add JSDoc comments to new components
- [ ] Document file size/type limits
- [ ] Add migration guide if API changes

---

## Phase 5: Advanced Features (Future)

### Task 5.1: URL-based Images (Optional)

Support `source.type: "url"` in addition to base64.

### Task 5.2: Files API Integration (Optional)

Support Claude's Files API for large/repeated files:

```typescript
{
  type: "image",
  source: {
    type: "file",
    file_id: "file_abc123"
  }
}
```

### Task 5.3: Server-side File Upload (Optional)

Add upload endpoint to portagent for:

- Large file handling
- File persistence
- Thumbnail generation

### Task 5.4: PDF Preview (Optional)

Inline PDF viewer in FileBlock component.

---

## File Change Summary

| Phase | File                                                     | Action | Priority |
| ----- | -------------------------------------------------------- | ------ | -------- |
| 1.1   | `packages/types/src/agent/message/parts/ImagePart.ts`    | Modify | P0       |
| 1.1   | `packages/types/src/agent/message/parts/FilePart.ts`     | Modify | P0       |
| 1.1   | `packages/types/src/agent/message/parts/DocumentPart.ts` | Create | P0       |
| 1.2   | `packages/runtime/src/environment/helpers.ts`            | Modify | P0       |
| 1.3   | `packages/agent/src/createAgent.ts`                      | Verify | P0       |
| 2.1   | `packages/ui/src/components/message/ImageBlock.tsx`      | Create | P1       |
| 2.2   | `packages/ui/src/components/message/FileBlock.tsx`       | Create | P1       |
| 2.3   | `packages/ui/src/components/message/MessageContent.tsx`  | Modify | P1       |
| 3.1   | `packages/ui/src/components/element/AttachmentList.tsx`  | Create | P1       |
| 3.2   | `packages/ui/src/components/element/FileAttachment.tsx`  | Create | P1       |
| 3.3   | `packages/ui/src/components/pane/InputPane.tsx`          | Modify | P1       |
| 3.4   | `packages/ui/src/utils/fileUtils.ts`                     | Create | P1       |

---

## Claude API Constraints

| Constraint             | Limit                             |
| ---------------------- | --------------------------------- |
| Image formats          | JPEG, PNG, GIF, WebP              |
| Max image size         | 5MB per image (API)               |
| Max image dimensions   | 8000x8000 px                      |
| Max images per request | 100 (API), 20 (claude.ai)         |
| PDF max request size   | 32MB                              |
| PDF max pages          | 100 per request                   |
| PDF format             | Standard (no password/encryption) |

---

## References

- [Claude Vision Documentation](https://platform.claude.com/docs/en/build-with-claude/vision)
- [Claude PDF Support](https://platform.claude.com/docs/en/build-with-claude/pdf-support)
- [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript)
