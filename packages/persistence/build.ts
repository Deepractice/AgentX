/**
 * Build script for @agentxjs/persistence
 *
 * Output structure (following unstorage pattern):
 *   dist/index.js      - main entry
 *   drivers/*.js       - individual drivers
 */

import { dts } from "bun-dts";
import { readdir } from "fs/promises";

await Bun.$`rm -rf dist`;

console.log("Building @agentxjs/persistence...\n");

// Build main entry
const mainResult = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  format: "esm",
  target: "node",
  sourcemap: "external",
  minify: false,
  external: ["@agentxjs/*", "db0", "db0/*", "ioredis", "mongodb", "mysql2", "mysql2/*", "pg"],
  plugins: [dts()],
});

if (!mainResult.success) {
  console.error("Main build failed:");
  for (const log of mainResult.logs) console.error(log);
  process.exit(1);
}

// Build drivers separately
const driverFiles = await readdir("./src/drivers");
const driverEntrypoints = driverFiles
  .filter((f) => f.endsWith(".ts"))
  .map((f) => `./src/drivers/${f}`);

const driversResult = await Bun.build({
  entrypoints: driverEntrypoints,
  outdir: "./dist/drivers",
  format: "esm",
  target: "node",
  sourcemap: "external",
  minify: false,
  external: [
    "@agentxjs/*",
    "unstorage",
    "unstorage/*",
    "db0",
    "db0/*",
    "ioredis",
    "mongodb",
    "mysql2",
    "mysql2/*",
    "pg",
  ],
  plugins: [dts()],
});

if (!driversResult.success) {
  console.error("Drivers build failed:");
  for (const log of driversResult.logs) console.error(log);
  process.exit(1);
}

console.log(`✅ Main: ${mainResult.outputs.length} files`);
console.log(`✅ Drivers: ${driversResult.outputs.length} files`);
console.log("🎉 Build complete!");
