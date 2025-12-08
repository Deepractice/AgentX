/**
 * StreamingMessage Stories
 *
 * Demonstrates streaming text with animated cursor.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { StreamingMessage } from "./StreamingMessage";

const meta: Meta<typeof StreamingMessage> = {
  title: "Message/StreamingMessage",
  component: StreamingMessage,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    text: {
      description: "Streaming text content",
      control: "text",
    },
  },
};

export default meta;
type Story = StoryObj<typeof StreamingMessage>;

/**
 * Basic streaming text
 */
export const Basic: Story = {
  args: {
    text: "I'm currently typing this message...",
  },
};

/**
 * Short streaming text
 */
export const Short: Story = {
  args: {
    text: "Hello!",
  },
};

/**
 * Long streaming text
 */
export const Long: Story = {
  args: {
    text: "This is a much longer streaming message that demonstrates how the component handles longer text. The cursor should appear at the end of this text and blink continuously to indicate that more content is being generated.",
  },
};

/**
 * Streaming code block
 */
export const CodeBlock: Story = {
  args: {
    text: `Here's some code I'm generating:

\`\`\`typescript
function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
\`\`\``,
  },
};

/**
 * Streaming with markdown formatting
 */
export const WithMarkdown: Story = {
  args: {
    text: `Let me explain **TypeScript generics**:

1. They provide *type safety*
2. Enable code reuse
3. Support \`constraint\` syntax`,
  },
};
