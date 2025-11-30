import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Chat } from "./Chat";
import type { Message, AgentError, AgentState } from "@deepractice-ai/agentx-types";

/**
 * Demo component for LoadingStates story
 */
function LoadingStatesDemo() {
  const [status, setStatus] = useState<AgentState>("thinking");

  const messages: Message[] = [
    {
      id: "1",
      role: "user",
      subtype: "user",
      content: "Hello!",
      timestamp: Date.now() - 5000,
    },
  ];

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b flex gap-2">
        <button
          onClick={() => setStatus("thinking")}
          className={`px-3 py-1 rounded ${status === "thinking" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          Thinking
        </button>
        <button
          onClick={() => setStatus("responding")}
          className={`px-3 py-1 rounded ${status === "responding" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          Responding
        </button>
        <button
          onClick={() => setStatus("planning_tool")}
          className={`px-3 py-1 rounded ${status === "planning_tool" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          Planning Tool
        </button>
        <button
          onClick={() => setStatus("awaiting_tool_result")}
          className={`px-3 py-1 rounded ${status === "awaiting_tool_result" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          Awaiting Result
        </button>
      </div>
      <div className="flex-1">
        <Chat
          messages={messages}
          status={status}
          isLoading={true}
          onSend={(text) => console.log("Send:", text)}
          onAbort={() => console.log("Abort!")}
        />
      </div>
    </div>
  );
}

/**
 * Demo component for Interactive story
 */
function InteractiveDemo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [status, setStatus] = useState<AgentState>("idle");

  const handleSend = (text: string) => {
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      subtype: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setStatus("thinking");

    setTimeout(() => {
      setStatus("responding");

      const response = `You said: "${text}". This is a mock response demonstrating the streaming effect.`;
      let index = 0;

      const interval = setInterval(() => {
        if (index < response.length) {
          setStreaming(response.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
          setStreaming("");
          setIsLoading(false);
          setStatus("idle");

          const aiMessage: Message = {
            id: `msg_${Date.now()}`,
            role: "assistant",
            subtype: "assistant",
            content: response,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, aiMessage]);
        }
      }, 20);
    }, 1000);
  };

  const handleAbort = () => {
    setIsLoading(false);
    setStreaming("");
    setStatus("idle");
  };

  return (
    <div className="h-screen">
      <Chat
        messages={messages}
        streaming={streaming}
        status={status}
        isLoading={isLoading}
        onSend={handleSend}
        onAbort={handleAbort}
      />
    </div>
  );
}

const meta: Meta<typeof Chat> = {
  title: "Chat/Chat",
  component: Chat,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `
Pure UI chat component for displaying messages and handling user input.

**This is a presentational component** - it does not handle Agent binding.
For real-time AI interaction, use the \`Agent\` component wrapper.

**Props:**
- \`messages\` - Array of messages to display
- \`streaming\` - Current streaming text
- \`errors\` - Array of errors to display
- \`status\` - Agent state (for status indicator)
- \`isLoading\` - Disables input and shows status indicator
- \`onSend\` - Callback when user sends a message
- \`onAbort\` - Callback to abort/interrupt current operation
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Chat>;

/**
 * Empty state - Welcome screen
 */
export const Empty: Story = {
  render: () => (
    <div className="h-screen">
      <Chat messages={[]} onSend={(text) => console.log("Send:", text)} />
    </div>
  ),
};

/**
 * Basic conversation
 */
export const WithMessages: Story = {
  render: () => {
    const messages: Message[] = [
      {
        id: "1",
        role: "user",
        subtype: "user",
        content: "Hello! What can you help me with?",
        timestamp: Date.now() - 60000,
      },
      {
        id: "2",
        role: "assistant",
        subtype: "assistant",
        content:
          "Hello! I can help you with a variety of tasks including coding, answering questions, and providing explanations. What would you like to know?",
        timestamp: Date.now() - 30000,
      },
    ];

    return (
      <div className="h-screen">
        <Chat messages={messages} onSend={(text) => console.log("Send:", text)} />
      </div>
    );
  },
};

/**
 * Streaming state - Shows partial response being generated
 */
export const Streaming: Story = {
  render: () => {
    const messages: Message[] = [
      {
        id: "1",
        role: "user",
        subtype: "user",
        content: "Write a short poem about coding",
        timestamp: Date.now() - 5000,
      },
    ];

    return (
      <div className="h-screen">
        <Chat
          messages={messages}
          streaming="In the realm of ones and zeros bright,\nWhere logic flows from day to night,\nThe coder sits with coffee near..."
          status="responding"
          isLoading={true}
          onSend={(text) => console.log("Send:", text)}
          onAbort={() => console.log("Abort!")}
        />
      </div>
    );
  },
};

/**
 * Loading states - Different status indicators
 */
export const LoadingStates: Story = {
  render: () => <LoadingStatesDemo />,
};

/**
 * With errors displayed
 */
export const WithErrors: Story = {
  render: () => {
    const messages: Message[] = [
      {
        id: "1",
        role: "user",
        subtype: "user",
        content: "Do something that causes an error",
        timestamp: Date.now() - 5000,
      },
    ];

    const errors: AgentError[] = [
      {
        category: "llm",
        code: "RATE_LIMITED",
        message: "Rate limit exceeded. Please try again in a few seconds.",
        severity: "error",
        recoverable: true,
      },
    ];

    return (
      <div className="h-screen">
        <Chat messages={messages} errors={errors} onSend={(text) => console.log("Send:", text)} />
      </div>
    );
  },
};

/**
 * Interactive demo - Mock responses with status
 */
export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};

/**
 * Long conversation with scroll
 */
export const LongConversation: Story = {
  render: () => {
    const messages: Message[] = [];
    for (let i = 0; i < 20; i++) {
      messages.push({
        id: `user_${i}`,
        role: "user",
        subtype: "user",
        content: `This is user message ${i + 1}. What do you think about this topic?`,
        timestamp: Date.now() - (20 - i) * 60000,
      });
      messages.push({
        id: `assistant_${i}`,
        role: "assistant",
        subtype: "assistant",
        content: `This is the assistant's response to message ${i + 1}. I think this is an interesting topic and here's my detailed thoughts on it. The response continues with more context and information.`,
        timestamp: Date.now() - (20 - i) * 60000 + 30000,
      });
    }

    return (
      <div className="h-screen">
        <Chat messages={messages} onSend={(text) => console.log("Send:", text)} />
      </div>
    );
  },
};

/**
 * Compact view (smaller container)
 */
export const CompactView: Story = {
  render: () => {
    const messages: Message[] = [
      {
        id: "1",
        role: "user",
        subtype: "user",
        content: "Hello!",
        timestamp: Date.now() - 60000,
      },
      {
        id: "2",
        role: "assistant",
        subtype: "assistant",
        content: "Hi there! How can I help you today?",
        timestamp: Date.now() - 30000,
      },
    ];

    return (
      <div className="h-[400px] border rounded-lg">
        <Chat messages={messages} onSend={(text) => console.log("Send:", text)} />
      </div>
    );
  },
};
