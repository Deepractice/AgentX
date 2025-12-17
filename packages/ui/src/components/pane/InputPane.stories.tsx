import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { InputPane } from "./InputPane";
import { InputToolBar } from "./InputToolBar";
import { Paperclip, Image, Smile, AtSign, Scissors, FolderOpen } from "lucide-react";

const meta: Meta<typeof InputPane> = {
  title: "Pane/InputPane",
  component: InputPane,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "WeChat-style full-height input area. The entire pane is an input zone with toolbar at top and send button at bottom right.",
      },
    },
  },
  argTypes: {
    disabled: {
      control: "boolean",
      description: "Whether the input is disabled",
    },
    isLoading: {
      control: "boolean",
      description: "Whether currently loading/processing",
    },
    placeholder: {
      control: "text",
      description: "Placeholder text",
    },
    showToolbar: {
      control: "boolean",
      description: "Show toolbar",
    },
  },
};

export default meta;
type Story = StoryObj<typeof InputPane>;

// WeChat-style toolbar items
const wechatToolbarItems = [
  { id: "emoji", icon: <Smile className="w-4 h-4" />, label: "Emoji" },
  { id: "capture", icon: <Scissors className="w-4 h-4" />, label: "Screenshot" },
  { id: "folder", icon: <FolderOpen className="w-4 h-4" />, label: "File" },
];

// Common toolbar items
const commonToolbarItems = [
  { id: "attach", icon: <Paperclip className="w-4 h-4" />, label: "Attach file" },
  { id: "image", icon: <Image className="w-4 h-4" />, label: "Add image" },
  { id: "emoji", icon: <Smile className="w-4 h-4" />, label: "Add emoji" },
];

const mentionItems = [{ id: "mention", icon: <AtSign className="w-4 h-4" />, label: "Mention" }];

export const Default: Story = {
  render: () => (
    <div className="w-full max-w-2xl h-40 border border-border rounded-lg overflow-hidden">
      <InputPane onSend={(text) => console.log("Send:", text)} placeholder="Type a message..." />
    </div>
  ),
};

export const WeChatStyle: Story = {
  render: () => (
    <div className="w-full max-w-2xl h-40 border border-border rounded-lg overflow-hidden">
      <InputPane
        onSend={(text) => console.log("Send:", text)}
        placeholder="Type a message..."
        toolbarItems={wechatToolbarItems}
        onToolbarItemClick={(id) => console.log("Toolbar click:", id)}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "WeChat-style input with emoji, screenshot, and file buttons",
      },
    },
  },
};

export const WithEmojiPicker: Story = {
  render: () => (
    <div className="w-full max-w-2xl h-80 border border-border rounded-lg overflow-hidden">
      <InputPane
        onSend={(text) => console.log("Send:", text)}
        placeholder="Click the emoji button to open picker..."
        toolbarItems={wechatToolbarItems}
        onToolbarItemClick={(id) => console.log("Toolbar click:", id)}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Click the emoji (smile) button to open the emoji picker. Select an emoji to insert it into the input.",
      },
    },
  },
};

export const WithToolbar: Story = {
  render: () => (
    <div className="w-full max-w-2xl h-40 border border-border rounded-lg overflow-hidden">
      <InputPane
        onSend={(text) => console.log("Send:", text)}
        placeholder="Type a message..."
        toolbarItems={commonToolbarItems}
        toolbarRightItems={mentionItems}
        onToolbarItemClick={(id) => console.log("Toolbar click:", id)}
      />
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="w-full max-w-2xl h-40 border border-border rounded-lg overflow-hidden">
      <InputPane
        onSend={(text) => console.log("Send:", text)}
        onStop={() => console.log("Stop clicked")}
        placeholder="Type a message..."
        toolbarItems={wechatToolbarItems}
        isLoading
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "When loading, the send button becomes a stop button",
      },
    },
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="w-full max-w-2xl h-40 border border-border rounded-lg overflow-hidden">
      <InputPane
        onSend={(text) => console.log("Send:", text)}
        placeholder="Input disabled..."
        toolbarItems={wechatToolbarItems}
        disabled
      />
    </div>
  ),
};

export const TallInput: Story = {
  render: () => (
    <div className="w-full max-w-2xl h-64 border border-border rounded-lg overflow-hidden">
      <InputPane
        onSend={(text) => console.log("Send:", text)}
        placeholder="This is a taller input area for longer messages..."
        toolbarItems={wechatToolbarItems}
        onToolbarItemClick={(id) => console.log("Toolbar click:", id)}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "InputPane fills the container height - just make the container taller",
      },
    },
  },
};

export const NoToolbar: Story = {
  render: () => (
    <div className="w-full max-w-2xl h-32 border border-border rounded-lg overflow-hidden">
      <InputPane
        onSend={(text) => console.log("Send:", text)}
        placeholder="Simple input without toolbar..."
      />
    </div>
  ),
};

export const Interactive: Story = {
  render: () => {
    const [messages, setMessages] = React.useState<string[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);

    const handleSend = (content: string | Array<{ type: string; text?: string }>) => {
      // Handle both string and multimodal content
      const text =
        typeof content === "string"
          ? content
          : content
              .filter((p) => p.type === "text")
              .map((p) => p.text)
              .join("\n");
      if (text) {
        setMessages((prev) => [...prev, text]);
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 2000);
      }
    };

    return (
      <div className="w-full max-w-2xl border border-border rounded-lg overflow-hidden">
        {/* Messages display */}
        <div className="h-48 overflow-y-auto p-4 bg-background">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">
              No messages yet. Type something below!
            </p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg, i) => (
                <div key={i} className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm max-w-[80%]">
                    {msg}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                    <span className="animate-pulse">Typing...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input - WeChat style */}
        <div className="h-36">
          <InputPane
            onSend={handleSend}
            onStop={() => setIsLoading(false)}
            isLoading={isLoading}
            placeholder="Type a message..."
            toolbarItems={wechatToolbarItems}
            onToolbarItemClick={(id) => console.log("Toolbar click:", id)}
          />
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Interactive demo with message history and loading states",
      },
    },
  },
};

// InputToolBar standalone story
export const ToolBarOnly: Story = {
  render: () => (
    <div className="w-full max-w-2xl border border-border rounded-lg p-2 bg-muted/30">
      <InputToolBar
        items={wechatToolbarItems}
        rightItems={mentionItems}
        onItemClick={(id) => console.log("Click:", id)}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "InputToolBar component can be used standalone",
      },
    },
  },
};

export const ToolBarSizes: Story = {
  render: () => (
    <div className="w-full max-w-2xl space-y-4">
      <div className="border border-border rounded-lg p-2 bg-muted/30">
        <p className="text-xs text-muted-foreground mb-2">Size: xs</p>
        <InputToolBar
          items={wechatToolbarItems}
          onItemClick={(id) => console.log("Click:", id)}
          size="xs"
        />
      </div>
      <div className="border border-border rounded-lg p-2 bg-muted/30">
        <p className="text-xs text-muted-foreground mb-2">Size: sm (default)</p>
        <InputToolBar
          items={wechatToolbarItems}
          onItemClick={(id) => console.log("Click:", id)}
          size="sm"
        />
      </div>
      <div className="border border-border rounded-lg p-2 bg-muted/30">
        <p className="text-xs text-muted-foreground mb-2">Size: md</p>
        <InputToolBar
          items={wechatToolbarItems}
          onItemClick={(id) => console.log("Click:", id)}
          size="md"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "InputToolBar supports different sizes",
      },
    },
  },
};

// Attachment support stories
export const WithAttachmentSupport: Story = {
  render: () => (
    <div className="w-full max-w-2xl h-48 border border-border rounded-lg overflow-hidden">
      <InputPane
        onSend={(content) => {
          if (typeof content === "string") {
            console.log("Text only:", content);
          } else {
            console.log("Multimodal content:", content);
          }
        }}
        placeholder="Type a message or drag & drop files..."
        toolbarItems={[
          { id: "emoji", icon: <Smile className="w-4 h-4" />, label: "Emoji" },
          { id: "image", icon: <Image className="w-4 h-4" />, label: "Add image" },
          { id: "attach", icon: <Paperclip className="w-4 h-4" />, label: "Attach file" },
        ]}
        enableAttachments
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "InputPane with attachment support. Click the image/attach buttons, drag & drop files, or paste images (Ctrl+V).",
      },
    },
  },
};

export const AttachmentConfig: Story = {
  render: () => (
    <div className="w-full max-w-2xl h-48 border border-border rounded-lg overflow-hidden">
      <InputPane
        onSend={(content) => console.log("Send:", content)}
        placeholder="Custom attachment settings..."
        toolbarItems={[
          { id: "image", icon: <Image className="w-4 h-4" />, label: "Add image" },
          { id: "attach", icon: <Paperclip className="w-4 h-4" />, label: "Attach file" },
        ]}
        enableAttachments
        maxAttachments={5}
        maxFileSize={10 * 1024 * 1024} // 10MB
        acceptedImageTypes={["image/jpeg", "image/png"]}
        acceptedFileTypes={["application/pdf", "text/plain"]}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Custom attachment configuration: max 5 files, 10MB limit, only JPEG/PNG images and PDF/TXT files.",
      },
    },
  },
};

export const DisabledAttachments: Story = {
  render: () => (
    <div className="w-full max-w-2xl h-40 border border-border rounded-lg overflow-hidden">
      <InputPane
        onSend={(content) => console.log("Send:", content)}
        placeholder="Attachments disabled..."
        toolbarItems={[
          { id: "emoji", icon: <Smile className="w-4 h-4" />, label: "Emoji" },
          { id: "image", icon: <Image className="w-4 h-4" />, label: "Add image" },
        ]}
        enableAttachments={false}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Toolbar buttons present but attachment handling is disabled.",
      },
    },
  },
};

export const DragAndDropDemo: Story = {
  render: () => (
    <div className="w-full max-w-2xl space-y-4">
      <div className="p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground">
        <p className="font-medium mb-2">Drag & Drop Demo</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Drag image files (JPEG, PNG, GIF, WebP) into the input area</li>
          <li>Drag PDF files for document attachments</li>
          <li>Paste images from clipboard (Ctrl+V)</li>
          <li>Maximum 10 files, 5MB each</li>
        </ul>
      </div>
      <div className="h-48 border border-border rounded-lg overflow-hidden">
        <InputPane
          onSend={(content) => {
            if (typeof content === "string") {
              console.log("Text:", content);
            } else {
              console.log(
                "Attachments:",
                content.map((p) =>
                  p.type === "text"
                    ? p.text
                    : `${p.type}: ${(p as { name?: string; filename?: string }).name || (p as { name?: string; filename?: string }).filename}`
                )
              );
            }
          }}
          placeholder="Drag files here or paste images..."
          toolbarItems={[
            { id: "image", icon: <Image className="w-4 h-4" />, label: "Add image" },
            { id: "attach", icon: <Paperclip className="w-4 h-4" />, label: "Attach file" },
            { id: "folder", icon: <FolderOpen className="w-4 h-4" />, label: "Browse files" },
          ]}
          enableAttachments
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Interactive demo showing drag & drop, paste, and toolbar button file selection.",
      },
    },
  },
};
