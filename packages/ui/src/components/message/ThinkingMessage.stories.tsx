/**
 * ThinkingMessage Stories
 *
 * Demonstrates thinking indicator with animated dots.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { ThinkingMessage } from "./ThinkingMessage";

const meta: Meta<typeof ThinkingMessage> = {
  title: "Message/ThinkingMessage",
  component: ThinkingMessage,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ThinkingMessage>;

/**
 * Default thinking indicator
 */
export const Default: Story = {
  args: {},
};

/**
 * In a conversation context
 */
export const InConversation: Story = {
  render: () => (
    <div className="space-y-4 w-[600px]">
      <div className="flex gap-3 py-2 flex-row-reverse">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 bg-primary text-primary-foreground">
          U
        </div>
        <div className="max-w-[80%] rounded-lg px-4 py-2 bg-primary text-primary-foreground">
          <div className="text-sm">Can you help me with React hooks?</div>
        </div>
      </div>
      <ThinkingMessage />
    </div>
  ),
};
