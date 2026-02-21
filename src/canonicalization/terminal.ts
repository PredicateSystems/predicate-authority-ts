/**
 * Terminal session canonicalization for reproducible state hashes.
 *
 * This module provides canonical normalization for terminal sessions,
 * ensuring that equivalent terminal states produce identical hashes
 * regardless of superficial differences (whitespace, ANSI codes, timestamps).
 */

import {
  type Platform,
  hashEnvironment,
  normalizeCommand,
  normalizePath,
  normalizeTranscript,
  sha256,
} from "./utils.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Raw terminal session snapshot from the runtime environment.
 */
export interface TerminalSessionSnapshot {
  session_id: string;
  terminal_id?: string;
  cwd?: string;
  command?: string;
  transcript?: string;
  exit_code?: number | null;
  env?: Record<string, string>;
  platform?: Platform;
  observed_at?: string;
}

/**
 * Canonical terminal snapshot with normalized fields.
 *
 * This is the deterministic representation used for hashing.
 */
export interface CanonicalTerminalSnapshot {
  session_id: string;
  terminal_id: string;
  cwd_normalized: string;
  command_normalized: string;
  transcript_normalized: string;
  exit_code: number | null;
  env_hash: string;
  platform: Platform;
}

// =============================================================================
// Canonicalization
// =============================================================================

/**
 * Canonicalize a terminal session snapshot.
 *
 * Normalizes all fields to produce a deterministic representation:
 * - `cwd`: Resolved to absolute path
 * - `command`: Trimmed and whitespace-collapsed (case preserved)
 * - `transcript`: ANSI stripped, timestamps normalized, whitespace collapsed
 * - `env`: Sorted, secrets redacted, then hashed
 *
 * @param snapshot - Raw terminal session snapshot
 * @returns Canonical snapshot for hashing
 */
export function canonicalizeTerminalSnapshot(
  snapshot: TerminalSessionSnapshot,
): CanonicalTerminalSnapshot {
  const platform = snapshot.platform ?? detectPlatform();

  return {
    session_id: snapshot.session_id,
    terminal_id: snapshot.terminal_id ?? "",
    cwd_normalized: normalizePath(snapshot.cwd),
    command_normalized: normalizeCommand(snapshot.command),
    transcript_normalized: normalizeTranscript(snapshot.transcript),
    exit_code: snapshot.exit_code ?? null,
    env_hash: hashEnvironment(snapshot.env),
    platform,
  };
}

/**
 * Compute state hash for a terminal session snapshot.
 *
 * The hash includes all canonical fields in a deterministic order.
 * Platform is included because different platforms have different
 * security contexts (e.g., Unix vs Windows permissions).
 *
 * @param snapshot - Raw or canonical terminal snapshot
 * @returns SHA-256 hash prefixed with "sha256:"
 */
export function computeTerminalStateHash(
  snapshot: TerminalSessionSnapshot | CanonicalTerminalSnapshot,
): string {
  // Canonicalize if not already canonical
  const canonical = isCanonicalTerminalSnapshot(snapshot)
    ? snapshot
    : canonicalizeTerminalSnapshot(snapshot);

  // Build deterministic JSON (sorted keys)
  const hashInput = JSON.stringify({
    command_normalized: canonical.command_normalized,
    cwd_normalized: canonical.cwd_normalized,
    env_hash: canonical.env_hash,
    exit_code: canonical.exit_code,
    platform: canonical.platform,
    session_id: canonical.session_id,
    terminal_id: canonical.terminal_id,
    transcript_normalized: canonical.transcript_normalized,
  });

  return `sha256:${sha256(hashInput)}`;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Detect the current platform.
 */
function detectPlatform(): Platform {
  const p = process.platform;
  if (p === "darwin" || p === "linux" || p === "win32") {
    return p;
  }
  // Default to linux for unknown Unix-like platforms
  return "linux";
}

/**
 * Type guard to check if a snapshot is already canonical.
 */
function isCanonicalTerminalSnapshot(
  snapshot: TerminalSessionSnapshot | CanonicalTerminalSnapshot,
): snapshot is CanonicalTerminalSnapshot {
  return (
    "cwd_normalized" in snapshot &&
    "command_normalized" in snapshot &&
    "transcript_normalized" in snapshot &&
    "env_hash" in snapshot
  );
}

// =============================================================================
// Schema Version
// =============================================================================

/**
 * Current schema version for terminal canonicalization.
 *
 * Increment major version for breaking changes to canonical format.
 * Increment minor version for additions that don't change existing hashes.
 */
export const TERMINAL_SCHEMA_VERSION = "terminal:v1.0";
