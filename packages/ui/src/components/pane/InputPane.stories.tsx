import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { InputPane } from "./InputPane";
import { InputToolBar } from "./InputToolBar";
import {
  Paperclip,
  Image,
  Smile,
  AtSign,
  Hash,
  Bold,
  Italic,
  Code,
} from "lucide-react";

const meta: Meta<typeof InputPane> = {
  title: "Pane/InputPane",
  component: InputPane,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Input area with optional toolbar for chat interfaces. Pure UI component with send/stop functionality.",
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

// Common toolbar items
const commonToolbarItems = [
  { id: "attach", icon: <Paperclip className="w-4 h-4" />, label: "Attach file" },
  { id: "image", icon: <Image className="w-4 h-4" />, label: "Add image" },
  { id: "emoji", icon: <Smile className="w-4 h-4" />, label: "Add emoji" },
];

const formattingItems = [
  { id: "bold", icon: <Bold className="w-4 h-4" />, label: "Bold" },
  { id: "italic", icon: <Italic className="w-4 h-4" />, label: "Italic" },
  { id: "code", icon: <Code className="w-4 h-4" />, label: "Code" },
];

const mentionItems = [
  { id: "mention", icon: <AtSign className="w-4 h-4" />, label: "Mention" },
  { id: "channel", icon: <Hash className="w-4 h-4" />, label: "Channel" },
];

export const Default: Story = {
  render: () => (
    <div className="w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <InputPane
        onSend={(text) => console.log("Send:", text)}
        placeholder="Type a message..."
      />
    </div>
  ),
};

export const WithToolbar: Story = {
  render: () => (
    <div className="w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <InputPane
        onSend={(text) => console.log("Send:", text)}
        placeholder="Type a message..."
        toolbarItems={commonToolbarItems}
        onToolbarItemClick={(id) => console.log("Toolbar click:", id)}
      />
    </div>
  ),
};

export const WithLeftAndRightToolbar: Story = {
  render: () => (
    <div className="w-full max-w-2xl border border-border rounded-lg overflow-hidden">
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
    <div className="w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <InputPane
        onSend={(text) => console.log("Send:", text)}
        onStop={() => console.log("Stop clicked")}
        placeholder="Type a message..."
        toolbarItems={commonToolbarItems}
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
    <div className="w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <InputPane
        onSend={(text) => console.log("Send:", text)}
        placeholder="Input disabled..."
        toolbarItems={commonToolbarItems}
        disabled
      />
    </div>
  ),
};

export const Interactive: Story = {
  render: () => {
    const [messages, setMessages] = React.useState<string[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);

    const handleSend = (text: string) => {
      setMessages((prev) => [...prev, text]);
      setIsLoading(true);
      // Simulate response
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    };

    const handleStop = () => {
      setIsLoading(false);
    };

    return (
      <div className="w-full max-w-2xl border border-border rounded-lg overflow-hidden">
        {/* Messages display */}
        <div className="h-48 overflow-y-auto p-4 bg-muted/20">
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

        {/* Input */}
        <InputPane
          onSend={handleSend}
          onStop={handleStop}
          isLoading={isLoading}
          placeholder="Type a message..."
          toolbarItems={commonToolbarItems}
          onToolbarItemClick={(id) => console.log("Toolbar click:", id)}
        />
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

export const CustomHeight: Story = {
  render: () => (
    <div className="w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <InputPane
        onSend={(text) => console.log("Send:", text)}
        placeholder="This input has custom min/max height..."
        minHeight={100}
        maxHeight={300}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Input with custom minimum and maximum heights",
      },
    },
  },
};

export const WithActiveToolbarItem: Story = {
  render: () => {
    const [activeItem, setActiveItem] = React.useState<string | null>("bold");

    const toggleItems = formattingItems.map((item) => ({
      ...item,
      active: item.id === activeItem,
    }));

    return (
      <div className="w-full max-w-2xl border border-border rounded-lg overflow-hidden">
        <InputPane
          onSend={(text) => console.log("Send:", text)}
          placeholder="Type a message..."
          toolbarItems={toggleItems}
          onToolbarItemClick={(id) => {
            setActiveItem(activeItem === id ? null : id);
          }}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Toolbar items can show active/toggled state",
      },
    },
  },
};

// InputToolBar standalone story
export const ToolBarOnly: Story = {
  render: () => (
    <div className="w-full max-w-2xl border border-border rounded-lg p-2">
      <InputToolBar
        items={commonToolbarItems}
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
      <div className="border border-border rounded-lg p-2">
        <p className="text-xs text-muted-foreground mb-2">Size: xs</p>
        <InputToolBar
          items={commonToolbarItems}
          onItemClick={(id) => console.log("Click:", id)}
          size="xs"
        />
      </div>
      <div className="border border-border rounded-lg p-2">
        <p className="text-xs text-muted-foreground mb-2">Size: sm (default)</p>
        <InputToolBar
          items={commonToolbarItems}
          onItemClick={(id) => console.log("Click:", id)}
          size="sm"
        />
      </div>
      <div className="border border-border rounded-lg p-2">
        <p className="text-xs text-muted-foreground mb-2">Size: md</p>
        <InputToolBar
          items={commonToolbarItems}
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
