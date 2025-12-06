import type { Meta, StoryObj } from "@storybook/react";
import { ChatPane } from "./ChatPane";
import type { UIMessage } from "~/hooks/useAgent";

const meta: Meta<typeof ChatPane> = {
  title: "Container/ChatPane",
  component: ChatPane,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-[600px] h-[500px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatPane>;

const mockMessages: UIMessage[] = [
  {
    id: "msg-1",
    role: "user",
    content: "Can you help me understand the event-driven architecture?",
    timestamp: Date.now() - 5 * 60 * 1000,
  },
  {
    id: "msg-2",
    role: "assistant",
    content:
      "Of course! Event-driven architecture is a software design pattern where the flow of the program is determined by events. In our system, we have four layers:\n\n1. **Stream Layer** - Real-time incremental events\n2. **State Layer** - State transitions\n3. **Message Layer** - Complete messages\n4. **Turn Layer** - Analytics",
    timestamp: Date.now() - 4 * 60 * 1000,
  },
  {
    id: "msg-3",
    role: "user",
    content: "What about tool calls?",
    timestamp: Date.now() - 3 * 60 * 1000,
  },
];

const messagesWithTools: UIMessage[] = [
  ...mockMessages,
  {
    id: "msg-4",
    role: "tool_call",
    content: JSON.stringify({ name: "search_files", args: { pattern: "*.ts" } }),
    timestamp: Date.now() - 2 * 60 * 1000,
  },
  {
    id: "msg-5",
    role: "tool_result",
    content: "Found 42 TypeScript files",
    timestamp: Date.now() - 1 * 60 * 1000,
  },
  {
    id: "msg-6",
    role: "assistant",
    content: "I found 42 TypeScript files in the project. Let me analyze them...",
    timestamp: Date.now(),
  },
];

export const Default: Story = {
  args: {
    messages: mockMessages,
    status: "idle",
    agentName: "Assistant",
    onSend: (text) => console.log("Send:", text),
    onInterrupt: () => console.log("Interrupt"),
    onSave: () => console.log("Save"),
  },
};

export const Empty: Story = {
  args: {
    messages: [],
    status: "idle",
    agentName: "New Chat",
    onSend: (text) => console.log("Send:", text),
  },
};

export const Thinking: Story = {
  args: {
    messages: mockMessages,
    status: "thinking",
    agentName: "Assistant",
    isLoading: true,
    onSend: (text) => console.log("Send:", text),
    onInterrupt: () => console.log("Interrupt"),
  },
};

export const Responding: Story = {
  args: {
    messages: mockMessages,
    streaming: "Tool calls are a way for the assistant to interact with external systems. When a tool is called, the system executes it and returns...",
    status: "responding",
    agentName: "Assistant",
    isLoading: true,
    onSend: (text) => console.log("Send:", text),
    onInterrupt: () => console.log("Interrupt"),
  },
};

export const ToolExecuting: Story = {
  args: {
    messages: messagesWithTools.slice(0, 4),
    status: "tool_executing",
    agentName: "Assistant",
    isLoading: true,
    onSend: (text) => console.log("Send:", text),
    onInterrupt: () => console.log("Interrupt"),
  },
};

export const WithToolCalls: Story = {
  args: {
    messages: messagesWithTools,
    status: "idle",
    agentName: "Assistant",
    onSend: (text) => console.log("Send:", text),
    onSave: () => console.log("Save"),
  },
};

export const Error: Story = {
  args: {
    messages: mockMessages,
    status: "error",
    agentName: "Assistant",
    onSend: (text) => console.log("Send:", text),
  },
};

export const LongConversation: Story = {
  args: {
    messages: [
      ...mockMessages,
      ...mockMessages.map((m, i) => ({ ...m, id: `${m.id}-dup-${i}` })),
      ...mockMessages.map((m, i) => ({ ...m, id: `${m.id}-dup2-${i}` })),
    ],
    status: "idle",
    agentName: "Assistant",
    onSend: (text) => console.log("Send:", text),
    onSave: () => console.log("Save"),
  },
};

export const NoSaveButton: Story = {
  args: {
    messages: mockMessages,
    status: "idle",
    agentName: "Assistant",
    onSend: (text) => console.log("Send:", text),
  },
};
