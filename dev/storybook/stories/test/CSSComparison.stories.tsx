import type { Meta, StoryObj } from "@storybook/react";
import { FileBlock } from "@agentxjs/ui";

const meta: Meta<typeof FileBlock> = {
  title: "Test/CSS Comparison",
  component: FileBlock,
  parameters: {
    docs: {
      description: {
        component: "Testing CSS loading: PostCSS vs Precompiled",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof FileBlock>;

const pdfData = "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3g=";

export const PDFFile: Story = {
  args: {
    data: pdfData,
    mediaType: "application/pdf",
    filename: "document.pdf",
  },
};

export const TextFile: Story = {
  args: {
    data: "SGVsbG8gV29ybGQ=",
    mediaType: "text/plain",
    filename: "readme.txt",
  },
};

/**
 * Expected styles:
 * - Icon background: bg-primary/10 (light blue background)
 * - Icon color: text-primary (blue)
 * - Filename: text-sm font-medium
 * - Type label: text-xs text-muted-foreground (gray)
 * - Border: border rounded-lg
 */
export const StyleDebug: Story = {
  args: {
    data: pdfData,
    mediaType: "application/pdf",
    filename: "test.pdf",
  },
  parameters: {
    docs: {
      description: {
        story: `
Check if these classes work:
- bg-primary/10 (should be light blue)
- text-primary (should be blue)
- text-muted-foreground (should be gray)
- gap-3, p-3, rounded-lg (layout)
        `,
      },
    },
  },
};
