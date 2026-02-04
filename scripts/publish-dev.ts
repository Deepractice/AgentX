#!/usr/bin/env bun
/**
 * Dev Package Publisher
 *
 * Publishes all packages with -dev tag, replacing workspace:* with actual versions.
 *
 * Usage:
 *   bun scripts/publish-dev.ts <otp>
 *   bun scripts/publish-dev.ts <otp1> <otp2> <otp3> ...
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

// Packages in dependency order
const PACKAGES = [
  "core",
  "claude-driver",
  "devtools",
  "node-provider",
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
  writeFileSync(path, JSON.stringify(content, null, 2) + "\n", "utf-8");
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

async function publishPackage(pkg: string, otp: string): Promise<boolean> {
  const pkgPath = getPackagePath(pkg);
  const pkgJson = readPackageJson(pkg);

  console.log(`\n📦 Publishing ${pkgJson.name}@${pkgJson.version}...`);

  // Backup original package.json
  const originalContent = readFileSync(join(pkgPath, "package.json"), "utf-8");

  try {
    // Replace workspace:* with actual version
    const modified: PackageJson = {
      ...pkgJson,
      dependencies: replaceWorkspaceRefs(pkgJson.dependencies, pkgJson.version),
      devDependencies: replaceWorkspaceRefs(pkgJson.devDependencies, pkgJson.version),
      peerDependencies: replaceWorkspaceRefs(pkgJson.peerDependencies, pkgJson.version),
    };

    writePackageJson(pkg, modified);

    // Publish
    const result = await $`cd ${pkgPath} && npm publish --tag dev --access public --otp=${otp} 2>&1`.text();
    console.log(result);

    if (result.includes(`+ ${pkgJson.name}@${pkgJson.version}`)) {
      console.log(`✅ ${pkgJson.name}@${pkgJson.version} published!`);
      return true;
    } else if (result.includes("EOTP")) {
      console.log(`❌ OTP expired or invalid for ${pkgJson.name}`);
      return false;
    } else if (result.includes("already exists")) {
      console.log(`⚠️ ${pkgJson.name}@${pkgJson.version} already exists, skipping...`);
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
  const otps = process.argv.slice(2);

  if (otps.length === 0) {
    console.log("Usage: bun scripts/publish-dev.ts <otp1> [otp2] [otp3] ...");
    console.log("");
    console.log("Provide OTP codes or recovery codes for npm 2FA.");
    console.log("If you have enough codes, provide one per package (6 total).");
    console.log("If you only have one, it will be reused (may fail for multiple packages).");
    process.exit(1);
  }

  console.log("🚀 Publishing dev packages...");
  console.log(`   Version: ${readPackageJson("core").version}`);
  console.log(`   Packages: ${PACKAGES.length}`);
  console.log(`   OTPs provided: ${otps.length}`);

  // Build first
  console.log("\n🔨 Building packages...");
  await $`bun run build`;

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < PACKAGES.length; i++) {
    const pkg = PACKAGES[i];
    // Use corresponding OTP or last available one
    const otp = otps[Math.min(i, otps.length - 1)];

    const success = await publishPackage(pkg, otp);
    if (success) {
      successCount++;
    } else {
      failCount++;
      // If OTP failed, likely all subsequent will fail too
      if (i < PACKAGES.length - 1) {
        console.log(`\n⚠️ Stopping due to OTP failure. Provide more OTPs to continue.`);
        break;
      }
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Published: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📦 Total: ${PACKAGES.length}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
