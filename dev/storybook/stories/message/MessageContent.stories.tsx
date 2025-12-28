import type { Meta, StoryObj } from "@storybook/react";
import { MessageContent } from "@agentxjs/ui";

// React needed for JSX in render functions

const meta: Meta<typeof MessageContent> = {
  title: "Message/MessageContent",
  component: MessageContent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Render message content with Markdown and multimodal support. Handles string content, ContentPart arrays, and other content types.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MessageContent>;

// Sample base64 image (1x1 red pixel PNG)
const sampleImageBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

// Sample file base64 (minimal content)
const sampleFileBase64 = "SGVsbG8gV29ybGQh"; // "Hello World!"

export const StringContent: Story = {
  args: {
    content: "This is a simple text message.",
  },
  parameters: {
    docs: {
      description: {
        story: "Simple string content rendered as text.",
      },
    },
  },
};

export const MarkdownContent: Story = {
  args: {
    content: `# Heading 1

This is a paragraph with **bold** and *italic* text.

## Code Example

\`\`\`typescript
function hello(name: string) {
  console.log(\`Hello, \${name}!\`);
}
\`\`\`

- List item 1
- List item 2
- List item 3

> This is a blockquote
`,
  },
  parameters: {
    docs: {
      description: {
        story: "Markdown content with headings, code blocks, lists, and blockquotes.",
      },
    },
  },
};

export const TextOnlyContentParts: Story = {
  args: {
    content: [
      { type: "text", text: "First paragraph of text." },
      { type: "text", text: "Second paragraph with **markdown**." },
      { type: "text", text: "Third paragraph." },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: "ContentPart array with only text parts - optimized to single Markdown render.",
      },
    },
  },
};

export const WithImage: Story = {
  args: {
    content: [
      { type: "text", text: "Here is the image you requested:" },
      {
        type: "image",
        data: sampleImageBase64,
        mediaType: "image/png",
        name: "sample.png",
      },
      { type: "text", text: "Let me know if you need anything else." },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: "Mixed content with text and image.",
      },
    },
  },
};

export const WithUrlImage: Story = {
  args: {
    content: [
      { type: "text", text: "Here is a photo from the web:" },
      {
        type: "image",
        data: "https://picsum.photos/300/200",
        mediaType: "image/jpeg",
        name: "photo.jpg",
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: "Image content with URL source instead of base64.",
      },
    },
  },
};

export const WithFile: Story = {
  args: {
    content: [
      { type: "text", text: "Here is the document you requested:" },
      {
        type: "file",
        data: sampleFileBase64,
        mediaType: "application/pdf",
        filename: "report.pdf",
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: "Mixed content with text and file attachment.",
      },
    },
  },
};

export const MultipleAttachments: Story = {
  args: {
    content: [
      { type: "text", text: "Here are all the files:" },
      {
        type: "image",
        data: "https://picsum.photos/200/150?random=1",
        mediaType: "image/jpeg",
        name: "photo1.jpg",
      },
      {
        type: "image",
        data: "https://picsum.photos/200/150?random=2",
        mediaType: "image/jpeg",
        name: "photo2.jpg",
      },
      {
        type: "file",
        data: sampleFileBase64,
        mediaType: "application/pdf",
        filename: "document.pdf",
      },
      {
        type: "file",
        data: sampleFileBase64,
        mediaType: "text/csv",
        filename: "data.csv",
      },
      { type: "text", text: "All files have been processed." },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: "Multiple images and files in a single message.",
      },
    },
  },
};

export const JsonContent: Story = {
  args: {
    content: {
      type: "custom",
      data: {
        key: "value",
        nested: {
          items: [1, 2, 3],
        },
      },
    },
  },
  parameters: {
    docs: {
      description: {
        story: "Non-standard content is rendered as formatted JSON.",
      },
    },
  },
};

export const EmptyContent: Story = {
  args: {
    content: "",
  },
  parameters: {
    docs: {
      description: {
        story: "Empty string content.",
      },
    },
  },
};

export const InChatContext: Story = {
  render: () => (
    <div className="max-w-2xl space-y-4">
      {/* User message */}
      <div className="flex justify-end">
        <div className="max-w-[80%] p-3 rounded-lg bg-primary text-primary-foreground">
          <MessageContent content="Can you show me an example with code and images?" />
        </div>
      </div>

      {/* Assistant message */}
      <div className="flex justify-start">
        <div className="max-w-[80%] p-3 rounded-lg bg-muted">
          <MessageContent
            content={[
              {
                type: "text",
                text: "Here's an example:\n\n```javascript\nconst greeting = 'Hello!';\nconsole.log(greeting);\n```",
              },
              {
                type: "image",
                data: "https://picsum.photos/300/150",
                mediaType: "image/jpeg",
                name: "example.jpg",
              },
              { type: "text", text: "Hope this helps!" },
            ]}
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "MessageContent used in a chat conversation context.",
      },
    },
  },
};
