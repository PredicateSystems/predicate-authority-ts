/**
 * Canonicalization module for non-web state evidence.
 *
 * This module provides consistent normalization for terminal and desktop
 * accessibility snapshots, ensuring reproducible state hashes across
 * different runs, platforms, and environments.
 *
 * @example
 * ```typescript
 * import {
 *   canonicalizeTerminalSnapshot,
 *   computeTerminalStateHash,
 *   canonicalizeDesktopSnapshot,
 *   computeDesktopStateHash,
 * } from "@predicatesystems/authority/canonicalization";
 *
 * // Terminal session
 * const terminalHash = computeTerminalStateHash({
 *   session_id: "sess-123",
 *   cwd: "~/projects/myapp",
 *   command: "npm  test",  // Extra whitespace normalized
 *   transcript: "\x1b[32mPASS\x1b[0m all tests",  // ANSI stripped
 * });
 *
 * // Desktop accessibility
 * const desktopHash = computeDesktopStateHash({
 *   app_name: "Firefox",
 *   window_title: "  GitHub - My Repo  ",  // Whitespace normalized
 *   focused_role: "button",
 *   focused_name: "Submit",
 * });
 * ```
 *
 * @module canonicalization
 */

// =============================================================================
// Re-exports: Utilities
// =============================================================================

export {
  // Types
  type Platform,
  // Text normalization
  normalizeText,
  normalizeCommand,
  // ANSI and timestamp handling
  stripAnsi,
  normalizeTimestamps,
  // Transcript normalization
  normalizeTranscript,
  // Path normalization
  normalizePath,
  // Environment hashing
  isSecretKey,
  hashEnvironment,
  // Core hashing
  sha256,
} from "./utils.js";

// =============================================================================
// Re-exports: Terminal Canonicalization
// =============================================================================

export {
  // Types
  type TerminalSessionSnapshot,
  type CanonicalTerminalSnapshot,
  // Functions
  canonicalizeTerminalSnapshot,
  computeTerminalStateHash,
  // Schema version
  TERMINAL_SCHEMA_VERSION,
} from "./terminal.js";

// =============================================================================
// Re-exports: Desktop Canonicalization
// =============================================================================

export {
  // Types
  type AccessibilityNode,
  type DesktopAccessibilitySnapshot,
  type CanonicalAccessibilityNode,
  type CanonicalDesktopSnapshot,
  // Functions
  canonicalizeAccessibilityNode,
  buildFocusedPath,
  canonicalizeDesktopSnapshot,
  computeDesktopStateHash,
  // Schema version
  DESKTOP_SCHEMA_VERSION,
} from "./desktop.js";
