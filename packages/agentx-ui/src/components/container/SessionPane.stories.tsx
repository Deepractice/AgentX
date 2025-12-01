/**
 * SessionPane Stories
 *
 * Session list panel for Sidebar.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { SessionPane } from "./SessionPane";
import type { SessionItem } from "./types";

const meta: Meta<typeof SessionPane> = {
  title: "Container/SessionPane",
  component: SessionPane,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-72 h-[600px] bg-sidebar border border-border">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SessionPane>;

// Mock constants
const MOCK_USER_ID = "user_default";
const MOCK_IMAGE_ID = "image_claude_abc123";

// Mock data
const mockSessions: SessionItem[] = [
  {
    sessionId: "session_1",
    userId: MOCK_USER_ID,
    imageId: MOCK_IMAGE_ID,
    title: "Code Refactoring",
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 1800000,
    preview: "Help me refactor this function to be more readable...",
    unreadCount: 2,
  },
  {
    sessionId: "session_2",
    userId: MOCK_USER_ID,
    imageId: MOCK_IMAGE_ID,
    title: "API Design Discussion",
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 43200000,
    preview: "What's the best approach for REST API versioning?",
  },
  {
    sessionId: "session_3",
    userId: MOCK_USER_ID,
    imageId: MOCK_IMAGE_ID,
    title: "Weekly Report Summary",
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 86400000,
    preview: "Summary of this week's progress and achievements",
  },
  {
    sessionId: "session_4",
    userId: MOCK_USER_ID,
    imageId: MOCK_IMAGE_ID,
    title: "Performance Optimization",
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 172800000,
    preview: "Analyzing the database query bottleneck",
  },
  {
    sessionId: "session_5",
    userId: MOCK_USER_ID,
    imageId: MOCK_IMAGE_ID,
    title: "Old Discussion",
    createdAt: Date.now() - 604800000,
    updatedAt: Date.now() - 604800000,
    preview: "This is an older conversation",
  },
];

/**
 * Default state with multiple sessions
 */
function DefaultComponent() {
  const [current, setCurrent] = useState<SessionItem | null>(mockSessions[0]);

  return (
    <SessionPane
      sessions={mockSessions}
      current={current}
      agentName="Claude"
      onSelect={setCurrent}
      onCreate={() => console.log("Create session")}
    />
  );
}

export const Default: Story = {
  render: () => <DefaultComponent />,
};

/**
 * Empty state - no sessions
 */
export const Empty: Story = {
  render: () => (
    <SessionPane
      sessions={[]}
      current={null}
      agentName="Claude"
      onSelect={() => {}}
      onCreate={() => console.log("Create session")}
    />
  ),
};

/**
 * Without agent name header
 */
function WithoutAgentNameComponent() {
  const [current, setCurrent] = useState<SessionItem | null>(mockSessions[0]);

  return (
    <SessionPane
      sessions={mockSessions}
      current={current}
      onSelect={setCurrent}
      onCreate={() => console.log("Create session")}
    />
  );
}

export const WithoutAgentName: Story = {
  render: () => <WithoutAgentNameComponent />,
};

/**
 * Many sessions (scrollable)
 */
function ManySessionsComponent() {
  const manySessions: SessionItem[] = Array.from({ length: 20 }, (_, i) => ({
    sessionId: `session_${i}`,
    userId: MOCK_USER_ID,
    imageId: MOCK_IMAGE_ID,
    title: `Topic ${i + 1}: ${["Bug Fix", "Feature Request", "Code Review", "Discussion", "Analysis"][i % 5]}`,
    createdAt: Date.now() - i * 86400000,
    updatedAt: Date.now() - i * 43200000,
    preview: `This is a preview of session ${i + 1}...`,
    unreadCount: i % 3 === 0 ? i % 5 : undefined,
  }));

  const [current, setCurrent] = useState<SessionItem | null>(manySessions[0]);

  return (
    <SessionPane
      sessions={manySessions}
      current={current}
      agentName="Claude"
      onSelect={setCurrent}
      onCreate={() => console.log("Create session")}
    />
  );
}

export const ManySessions: Story = {
  render: () => <ManySessionsComponent />,
};

/**
 * Without create button
 */
function WithoutCreateButtonComponent() {
  const [current, setCurrent] = useState<SessionItem | null>(mockSessions[0]);

  return (
    <SessionPane
      sessions={mockSessions}
      current={current}
      agentName="Claude"
      onSelect={setCurrent}
    />
  );
}

export const WithoutCreateButton: Story = {
  render: () => <WithoutCreateButtonComponent />,
};
