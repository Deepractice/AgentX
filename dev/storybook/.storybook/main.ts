import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
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
  typescript: {
    // Use react-docgen-typescript instead of react-docgen (avoids PrivateName error with Radix UI)
    reactDocgen: "react-docgen-typescript",
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  viteFinal: async (config) => {
    // Remove the problematic react-docgen plugin (it can't handle Radix UI's private fields)
    // This lets react-docgen-typescript handle prop extraction instead
    if (config.plugins) {
      config.plugins = config.plugins.filter((plugin) => {
        if (plugin && typeof plugin === "object" && "name" in plugin) {
          return plugin.name !== "storybook:react-docgen-plugin";
        }
        return true;
      });
    }
    // Configure path aliases to point to UI package
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "~": path.resolve(__dirname, "../../../packages/ui/src"),
      };
    }

    // Exclude server-only packages from optimization
    if (config.optimizeDeps) {
      config.optimizeDeps.exclude = [
        ...(config.optimizeDeps.exclude || []),
        "@agentxjs/runtime",
        "db0",
        "unstorage",
      ];
    }

    // Mark server-only dependencies as external for build
    if (!config.build) config.build = {};
    if (!config.build.rollupOptions) config.build.rollupOptions = {};

    const existingExternal = config.build.rollupOptions.external || [];
    const externalArray = Array.isArray(existingExternal) ? existingExternal : [existingExternal];

    config.build.rollupOptions.external = [
      ...externalArray,
      /^@agentxjs\/runtime/,
      /^db0\//,
      /^unstorage\//,
      /^bun:/,
      /^node:/,
      "pg",
      "mongodb",
      "mysql2",
    ];

    return config;
  },
};

export default config;
