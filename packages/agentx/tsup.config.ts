import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/protocol.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: [
    "@agentxjs/core",
    "@agentxjs/mono-driver",
    "@agentxjs/node-platform",
    "@deepracticex/logger",
    "reconnecting-websocket",
    "ws",
    "@deepracticex/logger",
    "jsonrpc-lite",
  ],
});
