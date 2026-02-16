#!/usr/bin/env bun
/**
 * Dev Package Publisher
 *
 * Publishes all packages with -dev tag, replacing workspace:* with unified version.
 *
 * Usage:
 *   bun scripts/publish-dev.ts <version> <otp1> [otp2] [otp3] ...
 *
 * Example:
 *   bun scripts/publish-dev.ts 1.9.7-dev abc123 def456 ...
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

// Packages in dependency order (dependencies first)
const PACKAGES = [
  "core",
  "claude-driver",
  // "devtools",  // Excluded - has optional peer dependency issues
  "node-platform",
  "server",
  "agentx",
];

const ROOT = join(import.meta.dir, "..");

interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

function getPackagePath(pkg: string): string {
  return join(ROOT, "packages", pkg);
}

function readPackageJson(pkg: string): PackageJson {
  const path = join(getPackagePath(pkg), "package.json");
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writePackageJson(pkg: string, content: PackageJson): void {
  const path = join(getPackagePath(pkg), "package.json");
  writeFileSync(path, `${JSON.stringify(content, null, 2)}\n`, "utf-8");
}

function replaceWorkspaceRefs(
  deps: Record<string, string> | undefined,
  version: string
): Record<string, string> | undefined {
  if (!deps) return deps;

  const result: Record<string, string> = {};
  for (const [name, ver] of Object.entries(deps)) {
    if (ver === "workspace:*") {
      result[name] = version;
    } else {
      result[name] = ver;
    }
  }
  return result;
}

async function setAllVersions(version: string): Promise<void> {
  console.log(`\n📝 Setting all package versions to ${version}...`);

  for (const pkg of PACKAGES) {
    const pkgJson = readPackageJson(pkg);
    pkgJson.version = version;
    writePackageJson(pkg, pkgJson);
    console.log(`   ${pkgJson.name} → ${version}`);
  }
}

async function publishPackage(pkg: string, version: string, otp: string): Promise<boolean> {
  const pkgPath = getPackagePath(pkg);
  const pkgJson = readPackageJson(pkg);

  console.log(`\n📦 Publishing ${pkgJson.name}@${version}...`);

  // Backup original package.json
  const originalContent = readFileSync(join(pkgPath, "package.json"), "utf-8");

  try {
    // Replace workspace:* with unified version
    const modified: PackageJson = {
      ...pkgJson,
      version,
      dependencies: replaceWorkspaceRefs(pkgJson.dependencies, version),
      devDependencies: replaceWorkspaceRefs(pkgJson.devDependencies, version),
      peerDependencies: replaceWorkspaceRefs(pkgJson.peerDependencies, version),
    };

    writePackageJson(pkg, modified);

    // Publish
    const result =
      await $`cd ${pkgPath} && npm publish --tag dev --access public --otp=${otp} 2>&1`.text();
    console.log(result);

    if (result.includes(`+ ${pkgJson.name}@${version}`)) {
      console.log(`✅ ${pkgJson.name}@${version} published!`);
      return true;
    } else if (result.includes("EOTP")) {
      console.log(`❌ OTP expired or invalid for ${pkgJson.name}`);
      return false;
    } else if (result.includes("already exists")) {
      console.log(`⚠️ ${pkgJson.name}@${version} already exists, skipping...`);
      return true;
    } else {
      console.log(`❌ Failed to publish ${pkgJson.name}`);
      return false;
    }
  } finally {
    // Restore original package.json
    writeFileSync(join(pkgPath, "package.json"), originalContent, "utf-8");
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log("Usage: bun scripts/publish-dev.ts <version> <otp1> [otp2] ...");
    console.log("");
    console.log("Arguments:");
    console.log("  version  - The version to publish (e.g., 1.9.7-dev)");
    console.log("  otp      - OTP codes for npm 2FA (one per package)");
    console.log("");
    console.log("Example:");
    console.log("  bun scripts/publish-dev.ts 1.9.7-dev abc123 def456 ghi789 ...");
    console.log("");
    console.log(`Packages to publish (${PACKAGES.length}):`);
    PACKAGES.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
    process.exit(1);
  }

  const version = args[0];
  const otps = args.slice(1);

  if (!version.endsWith("-dev")) {
    console.error("❌ Version must end with -dev");
    process.exit(1);
  }

  console.log("🚀 Publishing dev packages...");
  console.log(`   Version: ${version}`);
  console.log(`   Packages: ${PACKAGES.length}`);
  console.log(`   OTPs provided: ${otps.length}`);

  // Set all versions first
  await setAllVersions(version);

  // Build
  console.log("\n🔨 Building packages...");
  await $`bun run build`;

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < PACKAGES.length; i++) {
    const pkg = PACKAGES[i];
    const otp = otps[Math.min(i, otps.length - 1)];

    const success = await publishPackage(pkg, version, otp);
    if (success) {
      successCount++;
    } else {
      failCount++;
      if (i < PACKAGES.length - 1) {
        console.log(`\n⚠️ Stopping due to failure. Provide more OTPs to continue.`);
        break;
      }
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`✅ Published: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📦 Total: ${PACKAGES.length}`);
  console.log("");
  console.log("Install command:");
  console.log(`  pnpm add agentxjs@${version}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
