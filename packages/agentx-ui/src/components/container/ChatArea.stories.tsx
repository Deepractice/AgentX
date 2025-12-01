/**
 * ChatArea Stories
 *
 * Demonstrates the composition of AgentPane + InputPane.
 * This is the recommended pattern for building chat interfaces.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { useState } from "react";

import { AgentPane } from "./AgentPane";
import { InputPane } from "./InputPane";
import type { AgentDefinitionItem, SessionItem } from "./types";

const meta: Meta = {
  title: "Container/ChatArea",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "ChatArea demonstrates how to compose AgentPane + InputPane using Allotment. AgentPane displays messages, InputPane handles user input.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="h-screen bg-background">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj;

// Mock constants
const MOCK_USER_ID = "user_default";
const MOCK_IMAGE_ID = "image_claude_abc123";

// Mock data
const mockDefinition: AgentDefinitionItem = {
  name: "Claude",
  description: "General purpose assistant",
  icon: "C",
  color: "bg-blue-500",
  isOnline: true,
};

const mockSession: SessionItem = {
  sessionId: "session_1",
  userId: MOCK_USER_ID,
  imageId: MOCK_IMAGE_ID,
  title: "Code Refactoring Discussion",
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now(),
};

const mockMessages = [
  {
    id: "1",
    role: "user" as const,
    subtype: "user" as const,
    content: "Hello! Can you help me refactor this code?",
    timestamp: Date.now() - 120000,
  },
  {
    id: "2",
    role: "assistant" as const,
    subtype: "assistant" as const,
    content:
      "Of course! I'd be happy to help you refactor your code. Please share the code you'd like to improve.",
    timestamp: Date.now() - 60000,
  },
  {
    id: "3",
    role: "user" as const,
    subtype: "user" as const,
    content:
      "Here's the function I want to refactor:\n\nfunction getUserData() {\n  // complex logic\n}",
    timestamp: Date.now() - 30000,
  },
];

/**
 * Basic composition: AgentPane + InputPane
 */
function BasicCompositionComponent() {
  const [messages, setMessages] = useState(mockMessages);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = (text: string) => {
    console.log("Send:", text);
    const newMessage = {
      id: String(Date.now()),
      role: "user" as const,
      subtype: "user" as const,
      content: text,
      timestamp: Date.now(),
    };
    setMessages([...messages, newMessage]);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  const handleFileAttach = (files: File[]) => {
    console.log("Files attached:", files);
    files.forEach((file) => {
      console.log(`- ${file.name} (${file.type}, ${file.size} bytes)`);
    });
  };

  return (
    <Allotment vertical>
      <Allotment.Pane>
        <AgentPane
          definition={mockDefinition}
          session={mockSession}
          messages={messages}
          isLoading={isLoading}
        />
      </Allotment.Pane>

      <Allotment.Pane minSize={120} preferredSize={300}>
        <InputPane onSend={handleSend} onFileAttach={handleFileAttach} disabled={isLoading} />
      </Allotment.Pane>
    </Allotment>
  );
}

export const BasicComposition: Story = {
  render: () => <BasicCompositionComponent />,
};

/**
 * With streaming response
 */
function WithStreamingComponent() {
  const [messages, setMessages] = useState(mockMessages);
  const [streaming, setStreaming] = useState("I'm analyzing your code...");
  const [isLoading, setIsLoading] = useState(true);

  const handleSend = (text: string) => {
    console.log("Send:", text);
    const newMessage = {
      id: String(Date.now()),
      role: "user" as const,
      subtype: "user" as const,
      content: text,
      timestamp: Date.now(),
    };
    setMessages([...messages, newMessage]);
    setIsLoading(true);
    setStreaming("Processing your request...");
  };

  const handleFileAttach = (files: File[]) => {
    console.log("Files attached:", files);
  };

  return (
    <Allotment vertical>
      <Allotment.Pane>
        <AgentPane
          definition={mockDefinition}
          session={mockSession}
          messages={messages}
          streaming={streaming}
          isLoading={isLoading}
        />
      </Allotment.Pane>

      <Allotment.Pane minSize={120} preferredSize={300}>
        <InputPane onSend={handleSend} onFileAttach={handleFileAttach} disabled={isLoading} />
      </Allotment.Pane>
    </Allotment>
  );
}

export const WithStreaming: Story = {
  render: () => <WithStreamingComponent />,
};

/**
 * Empty conversation
 */
function EmptyConversationComponent() {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = (text: string) => {
    console.log("Send:", text);
    const newMessage = {
      id: String(Date.now()),
      role: "user" as const,
      subtype: "user" as const,
      content: text,
      timestamp: Date.now(),
    };
    setMessages([newMessage]);
    setIsLoading(true);
  };

  const handleFileAttach = (files: File[]) => {
    console.log("Files attached:", files);
  };

  return (
    <Allotment vertical>
      <Allotment.Pane>
        <AgentPane
          definition={mockDefinition}
          session={mockSession}
          messages={messages}
          isLoading={isLoading}
        />
      </Allotment.Pane>

      <Allotment.Pane minSize={120} preferredSize={300}>
        <InputPane onSend={handleSend} onFileAttach={handleFileAttach} disabled={isLoading} />
      </Allotment.Pane>
    </Allotment>
  );
}

export const EmptyConversation: Story = {
  render: () => <EmptyConversationComponent />,
};

/**
 * Large input pane for detailed messages
 */
function LargeInputPaneComponent() {
  const [messages] = useState(mockMessages);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = (text: string) => {
    console.log("Send:", text);
    setIsLoading(true);
  };

  const handleFileAttach = (files: File[]) => {
    console.log("Files attached:", files);
  };

  return (
    <Allotment vertical>
      <Allotment.Pane>
        <AgentPane
          definition={mockDefinition}
          session={mockSession}
          messages={messages}
          isLoading={isLoading}
        />
      </Allotment.Pane>

      <Allotment.Pane minSize={200} preferredSize={500}>
        <InputPane
          onSend={handleSend}
          onFileAttach={handleFileAttach}
          disabled={isLoading}
          placeholder="Type a detailed message... (larger input area)"
        />
      </Allotment.Pane>
    </Allotment>
  );
}

export const LargeInputPane: Story = {
  render: () => <LargeInputPaneComponent />,
};

/**
 * Offline agent state
 */
export const OfflineAgent: Story = {
  render: () => (
    <Allotment vertical>
      <Allotment.Pane>
        <AgentPane
          definition={{ ...mockDefinition, isOnline: false }}
          session={mockSession}
          messages={mockMessages}
          isLoading={false}
        />
      </Allotment.Pane>

      <Allotment.Pane minSize={120} preferredSize={300}>
        <InputPane
          onSend={(text) => console.log(text)}
          onFileAttach={(files) => console.log(files)}
          disabled
        />
      </Allotment.Pane>
    </Allotment>
  ),
};
