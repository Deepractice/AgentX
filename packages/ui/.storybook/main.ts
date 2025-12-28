import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-links",
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config) => {
    // Merge with existing Vite config
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "~": path.resolve(__dirname, "../src"),
      };
    }

    // Exclude server-only packages (prevent Vite from bundling them)
    if (config.optimizeDeps) {
      config.optimizeDeps.exclude = [...(config.optimizeDeps.exclude || []), "@agentxjs/runtime"];
    }

    // Mark server-only dependencies as external for Rollup
    if (config.build?.rollupOptions) {
      config.build.rollupOptions.external = [
        ...(Array.isArray(config.build.rollupOptions.external)
          ? config.build.rollupOptions.external
          : []),
        /^@agentxjs\/runtime/,
        /^db0\//,
        /^unstorage\//,
        /^bun:/,
        /^node:/,
        "pg",
        "mongodb",
        "mysql2",
      ];
    }

    return config;
  },
};

export default config;
