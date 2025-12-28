/**
 * Toast Stories
 */

import type { Meta, StoryObj } from "@storybook/react";
import { Toast, ToastContainer, useToast } from "./Toast";
import { Button } from "./Button";

const meta = {
  title: "Element/Toast",
  component: Toast,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Info Toast
 */
export const Info: Story = {
  args: {
    id: "toast-1",
    message: "This is an informational message",
    severity: "info",
    duration: 0, // Don't auto-dismiss in story
  },
};

/**
 * Warning Toast
 */
export const Warning: Story = {
  args: {
    id: "toast-2",
    message: "Warning: This action cannot be undone",
    severity: "warn",
    duration: 0,
  },
};

/**
 * Error Toast
 */
export const Error: Story = {
  args: {
    id: "toast-3",
    message: "Error: Failed to create agent",
    severity: "error",
    duration: 0,
  },
};

/**
 * Fatal Toast
 */
export const Fatal: Story = {
  args: {
    id: "toast-4",
    message: "Fatal: System is unavailable",
    severity: "fatal",
    duration: 0,
  },
};

/**
 * Long Message
 */
export const LongMessage: Story = {
  args: {
    id: "toast-5",
    message:
      "This is a very long error message that contains a lot of details about what went wrong. The container not found error indicates that the default container does not exist in the system.",
    severity: "error",
    duration: 0,
  },
};

/**
 * Toast Container with Multiple Toasts
 */
export const Container: StoryObj<typeof ToastContainer> = {
  render: () => {
    const toasts = [
      {
        id: "1",
        message: "Agent created successfully",
        severity: "info" as const,
        duration: 0,
      },
      {
        id: "2",
        message: "Container not found: default",
        severity: "error" as const,
        duration: 0,
      },
      {
        id: "3",
        message: "Warning: Low memory",
        severity: "warn" as const,
        duration: 0,
      },
    ];

    return <ToastContainer toasts={toasts} position="top-right" />;
  },
};

/**
 * Interactive Demo with useToast Hook
 */
export const InteractiveDemo = {
  render: () => {
    const ToastDemo = () => {
      const { toasts, showToast, dismissToast } = useToast();

      return (
        <div className="p-8">
          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-semibold">Click buttons to show toasts</h3>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="default"
                onClick={() => showToast("Operation completed successfully", "info")}
              >
                Show Info
              </Button>
              <Button
                variant="default"
                onClick={() => showToast("This action may have consequences", "warn")}
              >
                Show Warning
              </Button>
              <Button
                variant="destructive"
                onClick={() => showToast("Failed to complete operation", "error")}
              >
                Show Error
              </Button>
              <Button
                variant="destructive"
                onClick={() => showToast("System is unavailable", "fatal")}
              >
                Show Fatal
              </Button>
            </div>
          </div>

          <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
      );
    };

    return <ToastDemo />;
  },
};

/**
 * Different Positions
 */
export const Positions = {
  render: () => {
    const toasts = [
      {
        id: "pos-1",
        message: "Top Right Position",
        severity: "info" as const,
        duration: 0,
      },
    ];

    return (
      <div className="relative h-screen w-screen">
        <ToastContainer toasts={toasts} position="top-right" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-gray-500">Toast appears in top-right corner</p>
          <p className="text-sm text-gray-400 mt-2">
            Try changing the position prop to: top-left, bottom-right, bottom-left, top-center
          </p>
        </div>
      </div>
    );
  },
};
