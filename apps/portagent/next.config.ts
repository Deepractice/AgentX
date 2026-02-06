import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "@agentxjs/server",
    "@agentxjs/node-platform",
    "@agentxjs/mono-driver",
    "@agentxjs/core",
    "commonxjs",
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // ws is only used by RpcClient in Node.js (guarded by isBrowser() check)
      config.resolve.alias = {
        ...config.resolve.alias,
        ws: false,
      };
    }
    return config;
  },
};

export default nextConfig;
