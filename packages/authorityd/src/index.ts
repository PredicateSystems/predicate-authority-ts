/**
 * @predicatesystems/authorityd
 *
 * Predicate Authority Sidecar binary distribution for Node.js.
 *
 * This package provides the `predicate-authorityd` binary for your platform.
 * The binary is installed automatically via postinstall script based on
 * platform-specific optional dependencies.
 *
 * Usage:
 *   npx predicate-authorityd run --port 8787 --policy-file policy.json
 *
 * Or programmatically:
 *   import { getSidecarPath, spawnSidecar } from '@predicatesystems/authorityd';
 *   const sidecar = spawnSidecar({ port: 8787, policyFile: 'policy.json' });
 */

import { spawn, ChildProcess, SpawnOptions } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
 * Platform key for binary resolution
 */
export type PlatformKey =
  | "darwin-arm64"
  | "darwin-x64"
  | "linux-x64"
  | "linux-arm64"
  | "win32-x64";

/**
 * Sidecar spawn options
 */
export interface SidecarOptions {
  /** Host to bind to (default: 127.0.0.1) */
  host?: string;
  /** Port to bind to (default: 8787) */
  port?: number;
  /** Operating mode: local_only or cloud_connected */
  mode?: "local_only" | "cloud_connected";
  /** Path to policy JSON file */
  policyFile?: string;
  /** Path to local identity registry JSON file */
  identityFile?: string;
  /** Log level */
  logLevel?: "trace" | "debug" | "info" | "warn" | "error";
  /** Control-plane URL */
  controlPlaneUrl?: string;
  /** Tenant ID for control-plane */
  tenantId?: string;
  /** Project ID for control-plane */
  projectId?: string;
  /** API key for control-plane (prefer PREDICATE_API_KEY env var) */
  apiKey?: string;
  /** Enable control-plane sync */
  syncEnabled?: boolean;
  /** Fail open if control-plane unreachable */
  failOpen?: boolean;
  /** Additional spawn options */
  spawnOptions?: SpawnOptions;
}

/**
 * Get the current platform key
 */
export function getPlatformKey(): PlatformKey {
  const platform = os.platform();
  let arch = os.arch();

  // Normalize architecture
  if (arch === "x86_64" || arch === "amd64") {
    arch = "x64";
  } else if (arch === "aarch64") {
    arch = "arm64";
  }

  return `${platform}-${arch}` as PlatformKey;
}

/**
 * Get the path to the sidecar binary
 * @throws Error if binary not found
 */
export function getSidecarPath(): string {
  const binName = os.platform() === "win32" ? "predicate-authorityd.exe" : "predicate-authorityd";

  // Check the bin directory (set up by postinstall)
  const binPath = path.join(__dirname, "..", "bin", binName);
  if (fs.existsSync(binPath)) {
    return binPath;
  }

  // Fallback: check if binary is in PATH
  const pathDirs = (process.env.PATH || "").split(path.delimiter);
  for (const dir of pathDirs) {
    const candidate = path.join(dir, binName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Sidecar binary not found. Please ensure @predicatesystems/authorityd is installed correctly, ` +
      `or download manually from https://github.com/PredicateSystems/predicate-authority-sidecar/releases`
  );
}

/**
 * Check if the sidecar binary is available
 */
export function isSidecarAvailable(): boolean {
  try {
    getSidecarPath();
    return true;
  } catch {
    return false;
  }
}

/**
 * Build command-line arguments from options
 */
function buildArgs(options: SidecarOptions): string[] {
  const args: string[] = ["run"];

  if (options.host) {
    args.push("--host", options.host);
  }
  if (options.port !== undefined) {
    args.push("--port", String(options.port));
  }
  if (options.mode) {
    args.push("--mode", options.mode);
  }
  if (options.policyFile) {
    args.push("--policy-file", options.policyFile);
  }
  if (options.identityFile) {
    args.push("--identity-file", options.identityFile);
  }
  if (options.logLevel) {
    args.push("--log-level", options.logLevel);
  }
  if (options.controlPlaneUrl) {
    args.push("--control-plane-url", options.controlPlaneUrl);
  }
  if (options.tenantId) {
    args.push("--tenant-id", options.tenantId);
  }
  if (options.projectId) {
    args.push("--project-id", options.projectId);
  }
  if (options.apiKey) {
    args.push("--predicate-api-key", options.apiKey);
  }
  if (options.syncEnabled) {
    args.push("--sync-enabled");
  }
  if (options.failOpen) {
    args.push("--fail-open");
  }

  return args;
}

/**
 * Spawn the sidecar process
 *
 * @example
 * ```ts
 * import { spawnSidecar } from '@predicatesystems/authorityd';
 *
 * const sidecar = spawnSidecar({
 *   port: 8787,
 *   mode: 'local_only',
 *   policyFile: './policy.json',
 * });
 *
 * sidecar.on('close', (code) => {
 *   console.log(`Sidecar exited with code ${code}`);
 * });
 *
 * // Graceful shutdown
 * process.on('SIGTERM', () => {
 *   sidecar.kill('SIGTERM');
 * });
 * ```
 */
export function spawnSidecar(options: SidecarOptions = {}): ChildProcess {
  const binaryPath = getSidecarPath();
  const args = buildArgs(options);

  const spawnOpts: SpawnOptions = {
    stdio: "inherit",
    ...options.spawnOptions,
  };

  return spawn(binaryPath, args, spawnOpts);
}

/**
 * Get the sidecar version
 */
export async function getSidecarVersion(): Promise<string> {
  const binaryPath = getSidecarPath();

  return new Promise((resolve, reject) => {
    const proc = spawn(binaryPath, ["--version"], { stdio: "pipe" });
    let output = "";

    proc.stdout?.on("data", (data) => {
      output += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Failed to get version, exit code: ${code}`));
      }
    });

    proc.on("error", reject);
  });
}
