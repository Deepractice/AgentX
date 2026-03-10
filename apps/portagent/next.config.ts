import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "@agentxjs/node-platform",
    "@agentxjs/mono-driver",
    "@agentxjs/core",
    "@deepracticex/logger",
    "commonxjs",
    "jsonrpc-lite",
    "ws",
  ],
  turbopack: {
    resolveAlias: {
      // Node.js-only packages used by agentxjs in local mode (dynamic imports,
      // never executed in browser). Provide empty modules for client bundle.
      "@agentxjs/node-platform": { browser: "./empty.ts" },
      "@agentxjs/mono-driver": { browser: "./empty.ts" },
      ws: { browser: "./empty.ts" },
    },
  },
};

export default nextConfig;
