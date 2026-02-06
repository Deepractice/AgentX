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
};

export default nextConfig;
