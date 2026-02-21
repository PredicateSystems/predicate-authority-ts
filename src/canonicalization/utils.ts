/**
 * Shared canonicalization utilities for non-web contexts.
 *
 * These utilities provide consistent normalization for terminal and desktop
 * accessibility snapshots, ensuring reproducible state hashes.
 */

import { createHash } from "node:crypto";
import path from "node:path";

// =============================================================================
// Types
// =============================================================================

export type Platform = "darwin" | "linux" | "win32";

// =============================================================================
// Text Normalization
// =============================================================================

/**
 * Normalize text for canonical comparison.
 *
 * Transforms:
 * - Trims leading/trailing whitespace
 * - Collapses internal whitespace to single spaces
 * - Lowercases (for non-command text)
 * - Caps length
 *
 * @param text - Input text (may be null/undefined)
 * @param maxLen - Maximum length to retain (default: 80)
 * @returns Normalized text string (empty string if input is null/undefined)
 */
export function normalizeText(text: string | null | undefined, maxLen = 80): string {
  if (!text) return "";

  // Trim and collapse whitespace
  let normalized = text.split(/\s+/).join(" ").trim();

  // Lowercase
  normalized = normalized.toLowerCase();

  // Cap length
  if (normalized.length > maxLen) {
    normalized = normalized.slice(0, maxLen);
  }

  return normalized;
}

/**
 * Normalize a command string.
 *
 * Unlike normalizeText, this preserves case (commands are case-sensitive)
 * but still trims and collapses whitespace.
 *
 * @param cmd - Command string
 * @returns Normalized command
 */
export function normalizeCommand(cmd: string | null | undefined): string {
  if (!cmd) return "";

  // Trim and collapse whitespace only (preserve case)
  return cmd.split(/\s+/).join(" ").trim();
}

// =============================================================================
// ANSI Escape Code Handling
// =============================================================================

/**
 * ANSI escape sequence pattern.
 * Matches color codes, cursor movement, and terminal control sequences.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes require matching control characters
const ANSI_PATTERN = /\x1b\[[0-9;]*[a-zA-Z]/g;

/**
 * Remove all ANSI escape sequences from text.
 *
 * Handles:
 * - Color codes: \x1b[31m (red), \x1b[0m (reset)
 * - Cursor movement: \x1b[2J (clear screen)
 * - Terminal control sequences
 *
 * @param text - Text potentially containing ANSI codes
 * @returns Text with ANSI codes removed
 */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

// =============================================================================
// Timestamp Normalization
// =============================================================================

/**
 * Common timestamp patterns to normalize.
 */
const TIMESTAMP_PATTERNS = [
  /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?/g, // ISO 8601
  /\d{2}:\d{2}:\d{2}/g, // HH:MM:SS
  /\[\d+\.\d+s\]/g, // Duration [1.23s]
];

/**
 * Replace common timestamp patterns with placeholder.
 *
 * This ensures that transcript hashes remain stable across runs
 * even when timestamps differ.
 *
 * @param text - Text potentially containing timestamps
 * @returns Text with timestamps replaced by [TIMESTAMP]
 */
export function normalizeTimestamps(text: string): string {
  let result = text;
  for (const pattern of TIMESTAMP_PATTERNS) {
    result = result.replace(pattern, "[TIMESTAMP]");
  }
  return result;
}

// =============================================================================
// Transcript Normalization
// =============================================================================

/** Maximum transcript length in bytes (10KB) */
const MAX_TRANSCRIPT_LENGTH = 10 * 1024;

/**
 * Normalize a terminal transcript for canonical hashing.
 *
 * Steps:
 * 1. Strip ANSI escape codes
 * 2. Normalize timestamps
 * 3. For each line: trim trailing whitespace, collapse internal whitespace
 * 4. Remove empty trailing lines
 * 5. Cap total length
 *
 * @param transcript - Raw terminal transcript
 * @returns Normalized transcript
 */
export function normalizeTranscript(transcript: string | null | undefined): string {
  if (!transcript) return "";

  // Strip ANSI codes first
  let normalized = stripAnsi(transcript);

  // Normalize timestamps
  normalized = normalizeTimestamps(normalized);

  // Process line by line
  const lines = normalized.split("\n").map((line) => {
    // Trim trailing whitespace
    let processed = line.trimEnd();
    // Collapse internal whitespace (tabs -> space, multiple spaces -> single)
    processed = processed.replace(/\t/g, " ").replace(/ +/g, " ");
    return processed;
  });

  // Remove empty trailing lines
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  // Join and cap length
  let result = lines.join("\n");
  if (result.length > MAX_TRANSCRIPT_LENGTH) {
    result = result.slice(0, MAX_TRANSCRIPT_LENGTH);
  }

  return result;
}

// =============================================================================
// Path Normalization
// =============================================================================

/**
 * Normalize a file system path for canonical hashing.
 *
 * Handles:
 * - Home directory expansion (~ on Unix, %USERPROFILE% on Windows)
 * - Resolution of . and ..
 * - Conversion to absolute path
 * - Lowercase drive letter on Windows
 *
 * Note: Symlink resolution is not performed (would require async fs.realpath).
 *
 * @param inputPath - Path to normalize
 * @returns Normalized absolute path in OS-native format
 */
export function normalizePath(inputPath: string | null | undefined): string {
  if (!inputPath) return "";

  let normalized = inputPath;

  // Expand home directory (cross-platform)
  if (normalized.startsWith("~")) {
    // Unix/macOS: ~/foo -> /Users/name/foo
    normalized = normalized.replace(/^~/, process.env.HOME || "");
  } else if (normalized.includes("%USERPROFILE%")) {
    // Windows: %USERPROFILE%\foo -> C:\Users\name\foo
    normalized = normalized.replace(/%USERPROFILE%/gi, process.env.USERPROFILE || "");
  }

  // Resolve . and .. (uses OS-native separators)
  normalized = path.normalize(normalized);

  // Convert to absolute if relative
  if (!path.isAbsolute(normalized)) {
    normalized = path.resolve(normalized);
  }

  // Windows: lowercase drive letter for consistency (C: -> c:)
  if (process.platform === "win32" && /^[A-Z]:/.test(normalized)) {
    normalized = normalized[0].toLowerCase() + normalized.slice(1);
  }

  return normalized;
}

// =============================================================================
// Environment Variable Hashing
// =============================================================================

/**
 * Patterns that indicate an environment variable contains a secret.
 */
const SECRET_PATTERNS = [
  /^(AWS_|AZURE_|GCP_|GOOGLE_)/i, // Cloud providers
  /(_KEY|_SECRET|_TOKEN|_PASSWORD)$/i, // Common suffixes
  /^(API_KEY|AUTH_TOKEN|PRIVATE_KEY)$/i, // Common names
  /^(DATABASE_URL|REDIS_URL)$/i, // Connection strings
];

/**
 * Check if an environment variable key indicates a secret value.
 *
 * @param key - Environment variable name
 * @returns True if the key matches a secret pattern
 */
export function isSecretKey(key: string): boolean {
  return SECRET_PATTERNS.some((p) => p.test(key));
}

/**
 * Hash environment variables for canonical representation.
 *
 * - Redacts values for keys matching secret patterns
 * - Sorts keys for determinism
 * - Returns SHA-256 hash of canonical representation
 *
 * @param env - Environment variables
 * @returns SHA-256 hash of canonical env representation
 */
export function hashEnvironment(env: Record<string, string> | null | undefined): string {
  if (!env) return sha256("");

  // Filter out secrets
  const safeEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (isSecretKey(key)) {
      safeEnv[key] = "[REDACTED]";
    } else {
      safeEnv[key] = value;
    }
  }

  // Sort keys for determinism
  const sortedKeys = Object.keys(safeEnv).sort();
  const canonical = sortedKeys.map((k) => `${k}=${safeEnv[k]}`).join("\n");

  return sha256(canonical);
}

// =============================================================================
// Hashing
// =============================================================================

/**
 * Compute SHA-256 hash of input string.
 *
 * @param input - String to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}
