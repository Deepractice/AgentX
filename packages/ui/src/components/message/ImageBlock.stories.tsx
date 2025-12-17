import type { Meta, StoryObj } from "@storybook/react";
import { ImageBlock } from "./ImageBlock";

// React needed for JSX in render functions

const meta: Meta<typeof ImageBlock> = {
  title: "Message/ImageBlock",
  component: ImageBlock,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Display image in message content with loading state, error handling, and click-to-enlarge lightbox.",
      },
    },
  },
  argTypes: {
    src: {
      control: "text",
      description: "Image source (base64 data or URL)",
    },
    alt: {
      control: "text",
      description: "Image alt text",
    },
    mediaType: {
      control: "text",
      description: "Image MIME type",
    },
  },
};

export default meta;
type Story = StoryObj<typeof ImageBlock>;

// Sample base64 image (1x1 red pixel PNG)
const sampleBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

// Sample placeholder image URL
const sampleImageUrl = "https://picsum.photos/300/200";

export const Default: Story = {
  args: {
    src: sampleImageUrl,
    alt: "Sample image",
  },
  parameters: {
    docs: {
      description: {
        story: "Default image block with URL source. Click to open lightbox.",
      },
    },
  },
};

export const Base64Image: Story = {
  args: {
    src: sampleBase64,
    mediaType: "image/png",
    alt: "Base64 encoded image",
  },
  parameters: {
    docs: {
      description: {
        story: "Image from base64 data with explicit media type.",
      },
    },
  },
};

export const WithDataUrl: Story = {
  args: {
    src: `data:image/png;base64,${sampleBase64}`,
    alt: "Data URL image",
  },
  parameters: {
    docs: {
      description: {
        story: "Image with full data URL (already includes media type prefix).",
      },
    },
  },
};

export const LargeImage: Story = {
  args: {
    src: "https://picsum.photos/800/600",
    alt: "Large image",
  },
  parameters: {
    docs: {
      description: {
        story: "Large image is constrained by max dimensions. Click to see full size in lightbox.",
      },
    },
  },
};

export const ErrorState: Story = {
  args: {
    src: "https://invalid-url-that-does-not-exist.com/image.png",
    alt: "Broken image",
  },
  parameters: {
    docs: {
      description: {
        story: "Error state when image fails to load.",
      },
    },
  },
};

export const MultipleImages: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <ImageBlock src="https://picsum.photos/200/150?random=1" alt="Image 1" />
      <ImageBlock src="https://picsum.photos/200/150?random=2" alt="Image 2" />
      <ImageBlock src="https://picsum.photos/200/150?random=3" alt="Image 3" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Multiple images displayed together.",
      },
    },
  },
};

export const InMessageContext: Story = {
  render: () => (
    <div className="max-w-md p-4 rounded-lg bg-muted/30 border border-border">
      <p className="text-sm mb-2">Here is the image you requested:</p>
      <ImageBlock src="https://picsum.photos/300/200" alt="Requested image" className="my-2" />
      <p className="text-sm mt-2">Let me know if you need anything else.</p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "ImageBlock used within a message context.",
      },
    },
  },
};
