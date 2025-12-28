import type { Meta, StoryObj } from "@storybook/react";
import { MessageAvatar } from "@agentxjs/ui";

const meta: Meta<typeof MessageAvatar> = {
  title: "Message/MessageAvatar",
  component: MessageAvatar,
  tags: ["autodocs"],
  argTypes: {
    role: {
      control: "select",
      options: ["user", "assistant", "system", "tool", "error"],
      description: "Message role",
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Display avatar for different message roles. Pure UI component based on MessageRole type.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MessageAvatar>;

export const User: Story = {
  args: {
    role: "user",
  },
};

export const Assistant: Story = {
  args: {
    role: "assistant",
  },
};

export const System: Story = {
  args: {
    role: "system",
  },
};

export const Tool: Story = {
  args: {
    role: "tool",
  },
};

export const Error: Story = {
  args: {
    role: "error",
  },
};

export const AllRoles: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <MessageAvatar role="user" />
        <span className="text-sm">User</span>
      </div>
      <div className="flex items-center gap-3">
        <MessageAvatar role="assistant" />
        <span className="text-sm">Assistant</span>
      </div>
      <div className="flex items-center gap-3">
        <MessageAvatar role="system" />
        <span className="text-sm">System</span>
      </div>
      <div className="flex items-center gap-3">
        <MessageAvatar role="tool" />
        <span className="text-sm">Tool</span>
      </div>
      <div className="flex items-center gap-3">
        <MessageAvatar role="error" />
        <span className="text-sm">Error</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "All available message roles with their respective colors",
      },
    },
  },
};
