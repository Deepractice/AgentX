import type { Preview } from "@storybook/react";
import "../styles.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "light",
      values: [
        {
          name: "light",
          value: "#ffffff",
        },
        {
          name: "dark",
          value: "#0f172a",
        },
      ],
    },
    options: {
      // Sort: Business first, then UI components
      storySort: {
        order: [
          "Container", // Business logic (highest level)
          "Message", // Message display
          "Input", // User input
          "Layout", // Structural layout
          "Element", // Atomic UI components
          "Typography", // Text rendering
          "*",
        ],
      },
    },
  },
};

export default preview;
