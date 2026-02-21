#!/usr/bin/env node

/**
 * Post-install script for @predicatesystems/authorityd
 *
 * This script runs after npm install and sets up the appropriate binary
 * symlink based on the current platform.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const PLATFORM_PACKAGES = {
  "darwin-arm64": "@predicatesystems/authorityd-darwin-arm64",
  "darwin-x64": "@predicatesystems/authorityd-darwin-x64",
  "linux-x64": "@predicatesystems/authorityd-linux-x64",
  "linux-arm64": "@predicatesystems/authorityd-linux-arm64",
  "win32-x64": "@predicatesystems/authorityd-win32-x64",
};

function getPlatformKey() {
  const platform = os.platform();
  const arch = os.arch();

  // Normalize architecture
  let normalizedArch = arch;
  if (arch === "x86_64" || arch === "amd64") {
    normalizedArch = "x64";
  } else if (arch === "aarch64") {
    normalizedArch = "arm64";
  }

  return `${platform}-${normalizedArch}`;
}

function getBinaryName() {
  return os.platform() === "win32" ? "predicate-authorityd.exe" : "predicate-authorityd";
}

function findPlatformPackage(platformKey) {
  const packageName = PLATFORM_PACKAGES[platformKey];
  if (!packageName) {
    return null;
  }

  // Try to find the platform-specific package
  const possiblePaths = [
    // Hoisted to node_modules root
    path.join(__dirname, "..", "..", "..", packageName),
    // Inside this package's node_modules
    path.join(__dirname, "..", "node_modules", packageName),
    // npm workspaces / pnpm
    path.join(__dirname, "..", "..", packageName),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

function main() {
  const platformKey = getPlatformKey();
  const binaryName = getBinaryName();

  console.log(`[authorityd] Platform: ${platformKey}`);

  const platformPackagePath = findPlatformPackage(platformKey);

  if (!platformPackagePath) {
    console.log(`[authorityd] No platform-specific package found for ${platformKey}`);
    console.log(`[authorityd] You can manually download the binary from:`);
    console.log(`[authorityd] https://github.com/PredicateSystems/predicate-authority-sidecar/releases`);
    return;
  }

  const sourceBinary = path.join(platformPackagePath, "bin", binaryName);
  const targetBinary = path.join(__dirname, "..", "bin", "predicate-authorityd");

  if (!fs.existsSync(sourceBinary)) {
    console.error(`[authorityd] Binary not found at ${sourceBinary}`);
    process.exit(1);
  }

  // Ensure bin directory exists
  const binDir = path.dirname(targetBinary);
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  // Create symlink or copy (symlink preferred, copy for Windows)
  try {
    // Remove existing file/symlink if present
    if (fs.existsSync(targetBinary)) {
      fs.unlinkSync(targetBinary);
    }

    if (os.platform() === "win32") {
      // Windows: copy the binary
      fs.copyFileSync(sourceBinary, targetBinary);
    } else {
      // Unix: create symlink
      fs.symlinkSync(sourceBinary, targetBinary);
    }

    // Make executable on Unix
    if (os.platform() !== "win32") {
      fs.chmodSync(targetBinary, 0o755);
    }

    console.log(`[authorityd] Binary installed successfully`);
    console.log(`[authorityd] Run with: npx predicate-authorityd run --help`);
  } catch (err) {
    console.error(`[authorityd] Failed to install binary: ${err.message}`);
    process.exit(1);
  }
}

main();
