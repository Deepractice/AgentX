import type { Meta, StoryObj } from "@storybook/react";
import { ImagePane } from "./ImagePane";
import type { ImageItem } from "./types";

const meta: Meta<typeof ImagePane> = {
  title: "Container/ImagePane",
  component: ImagePane,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-64 h-96 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ImagePane>;

const mockImages: ImageItem[] = [
  {
    imageId: "img-1",
    agentId: "agent-1",
    containerId: "container-1",
    name: "Code Review Discussion",
    createdAt: Date.now() - 5 * 60 * 1000, // 5 minutes ago
    messages: [],
    preview: "Let me review the authentication module...",
    isActive: true,
  },
  {
    imageId: "img-2",
    agentId: "agent-2",
    containerId: "container-1",
    name: "API Design",
    createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    messages: [],
    preview: "We should use REST endpoints for...",
  },
  {
    imageId: "img-3",
    agentId: "agent-3",
    containerId: "container-1",
    name: "Bug Investigation",
    createdAt: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
    messages: [],
    preview: "The issue appears to be in the SSE handler...",
  },
  {
    imageId: "img-4",
    agentId: "agent-4",
    containerId: "container-1",
    name: "Performance Optimization",
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
    messages: [],
    preview: "Looking at the database queries...",
  },
];

export const Default: Story = {
  args: {
    images: mockImages,
    selectedImageId: "img-1",
    onSelectImage: (image) => console.log("Selected:", image.imageId),
    onDeleteImage: (id) => console.log("Delete:", id),
    onNewConversation: () => console.log("New conversation"),
  },
};

export const Empty: Story = {
  args: {
    images: [],
    onNewConversation: () => console.log("New conversation"),
  },
};

export const Loading: Story = {
  args: {
    images: [],
    isLoading: true,
  },
};

export const SingleItem: Story = {
  args: {
    images: [mockImages[0]],
    selectedImageId: "img-1",
    onSelectImage: (image) => console.log("Selected:", image.imageId),
    onDeleteImage: (id) => console.log("Delete:", id),
    onNewConversation: () => console.log("New conversation"),
  },
};

export const ManyItems: Story = {
  args: {
    images: [
      ...mockImages,
      {
        imageId: "img-5",
        agentId: "agent-5",
        containerId: "container-1",
        name: "Database Migration",
        createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
        messages: [],
        preview: "Planning the schema changes...",
      },
      {
        imageId: "img-6",
        agentId: "agent-6",
        containerId: "container-1",
        name: "Testing Strategy",
        createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
        messages: [],
        preview: "We need to add integration tests...",
      },
      {
        imageId: "img-7",
        agentId: "agent-7",
        containerId: "container-1",
        name: "Deployment Pipeline",
        createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
        messages: [],
        preview: "Setting up CI/CD workflow...",
      },
    ],
    onSelectImage: (image) => console.log("Selected:", image.imageId),
    onDeleteImage: (id) => console.log("Delete:", id),
    onNewConversation: () => console.log("New conversation"),
  },
};

export const NoSelection: Story = {
  args: {
    images: mockImages,
    selectedImageId: null,
    onSelectImage: (image) => console.log("Selected:", image.imageId),
    onDeleteImage: (id) => console.log("Delete:", id),
    onNewConversation: () => console.log("New conversation"),
  },
};
