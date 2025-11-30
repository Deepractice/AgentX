import type { Meta, StoryObj } from "@storybook/react";
import { StatusIndicator } from "./StatusIndicator";

const meta: Meta<typeof StatusIndicator> = {
  title: "Chat/StatusIndicator",
  component: StatusIndicator,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: [
        "idle",
        "ready",
        "initializing",
        "queued",
        "thinking",
        "responding",
        "planning_tool",
        "awaiting_tool_result",
        "conversation_active",
      ],
    },
    isLoading: {
      control: "boolean",
    },
    showAbortButton: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatusIndicator>;

/**
 * Idle state - nothing shown (isLoading=false)
 */
export const Idle: Story = {
  args: {
    status: "idle",
    isLoading: false,
  },
};

/**
 * Queued state - message received, waiting to be processed
 */
export const Queued: Story = {
  args: {
    status: "queued",
    isLoading: true,
    onAbort: () => console.log("Abort clicked"),
  },
};

/**
 * Thinking state - agent is processing
 */
export const Thinking: Story = {
  args: {
    status: "thinking",
    isLoading: true,
    onAbort: () => console.log("Abort clicked"),
  },
};

/**
 * Responding state - agent is generating response
 */
export const Responding: Story = {
  args: {
    status: "responding",
    isLoading: true,
    onAbort: () => console.log("Abort clicked"),
  },
};

/**
 * Planning tool state - agent is preparing tool call
 */
export const PlanningTool: Story = {
  args: {
    status: "planning_tool",
    isLoading: true,
    onAbort: () => console.log("Abort clicked"),
  },
};

/**
 * Awaiting tool result state - waiting for tool execution
 */
export const AwaitingToolResult: Story = {
  args: {
    status: "awaiting_tool_result",
    isLoading: true,
    onAbort: () => console.log("Abort clicked"),
  },
};

/**
 * Conversation active state - general processing
 */
export const ConversationActive: Story = {
  args: {
    status: "conversation_active",
    isLoading: true,
    onAbort: () => console.log("Abort clicked"),
  },
};

/**
 * Without abort button
 */
export const WithoutAbortButton: Story = {
  args: {
    status: "responding",
    isLoading: true,
    showAbortButton: false,
  },
};

/**
 * With custom className
 */
export const WithCustomClass: Story = {
  args: {
    status: "thinking",
    isLoading: true,
    className: "max-w-md",
    onAbort: () => console.log("Abort clicked"),
  },
};
