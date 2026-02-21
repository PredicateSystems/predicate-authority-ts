/**
 * Desktop accessibility tree canonicalization for reproducible state hashes.
 *
 * This module provides canonical normalization for desktop accessibility snapshots,
 * ensuring that equivalent UI states produce identical hashes regardless of
 * superficial differences (whitespace, element order, transient attributes).
 */

import { type Platform, normalizeText, sha256 } from "./utils.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Raw accessibility tree node from the runtime environment.
 */
export interface AccessibilityNode {
  role?: string;
  name?: string;
  children?: AccessibilityNode[];
  // Transient attributes (ignored in canonicalization)
  pid?: number;
  position?: { x: number; y: number };
  focused?: boolean;
  selected?: boolean;
}

/**
 * Raw desktop accessibility snapshot from the runtime environment.
 */
export interface DesktopAccessibilitySnapshot {
  app_name?: string;
  window_title?: string;
  focused_role?: string;
  focused_name?: string;
  ui_tree?: AccessibilityNode;
  ui_tree_text?: string;
  platform?: Platform;
  observed_at?: string;
  confidence?: number;
}

/**
 * Canonical accessibility node with normalized fields.
 */
export interface CanonicalAccessibilityNode {
  role: string;
  name_norm: string;
  children: CanonicalAccessibilityNode[];
}

/**
 * Canonical desktop snapshot with normalized fields.
 *
 * This is the deterministic representation used for hashing.
 */
export interface CanonicalDesktopSnapshot {
  app_name_norm: string;
  window_title_norm: string;
  focused_path: string;
  tree_hash: string;
  platform: Platform;
}

// =============================================================================
// Constants
// =============================================================================

/** Maximum depth for UI tree canonicalization */
const MAX_TREE_DEPTH = 10;

/** Maximum children per node */
const MAX_CHILDREN_PER_NODE = 50;

/** Maximum length for window title */
const MAX_WINDOW_TITLE_LENGTH = 100;

// =============================================================================
// Accessibility Node Canonicalization
// =============================================================================

/**
 * Canonicalize an accessibility tree node.
 *
 * Normalizes:
 * - `role`: Lowercase, trimmed
 * - `name`: Text normalization (whitespace, case, length)
 * - `children`: Recursively canonicalized, sorted by (role, name)
 *
 * Ignores transient attributes: pid, position, focused, selected.
 *
 * @param node - Raw accessibility node
 * @param depth - Current depth (for truncation)
 * @returns Canonical node
 */
export function canonicalizeAccessibilityNode(
  node: AccessibilityNode | null | undefined,
  depth = 0,
): CanonicalAccessibilityNode {
  if (!node) {
    return { role: "", name_norm: "", children: [] };
  }

  const role = (node.role ?? "").toLowerCase().trim();
  const nameNorm = normalizeText(node.name);

  // Truncate at max depth
  if (depth >= MAX_TREE_DEPTH) {
    return {
      role,
      name_norm: nameNorm,
      children: [], // Truncated
    };
  }

  // Canonicalize children
  let children: CanonicalAccessibilityNode[] = [];
  if (node.children && Array.isArray(node.children)) {
    // Limit children count
    const limitedChildren = node.children.slice(0, MAX_CHILDREN_PER_NODE);

    // Canonicalize each child
    children = limitedChildren.map((child) =>
      canonicalizeAccessibilityNode(child, depth + 1),
    );

    // Sort children by (role, name_norm) for determinism
    children.sort((a, b) => {
      const roleCompare = a.role.localeCompare(b.role);
      if (roleCompare !== 0) return roleCompare;
      return a.name_norm.localeCompare(b.name_norm);
    });
  }

  return {
    role,
    name_norm: nameNorm,
    children,
  };
}

/**
 * Build a focused element path string.
 *
 * Creates a path like "window/toolbar/button[Save]" representing
 * the path to the focused element in the accessibility tree.
 *
 * @param focusedRole - Role of the focused element
 * @param focusedName - Name of the focused element
 * @returns Path string
 */
export function buildFocusedPath(
  focusedRole?: string,
  focusedName?: string,
): string {
  const role = (focusedRole ?? "").toLowerCase().trim();
  const name = normalizeText(focusedName);

  if (!role && !name) {
    return "";
  }

  if (!name) {
    return role;
  }

  return `${role}[${name}]`;
}

// =============================================================================
// Desktop Snapshot Canonicalization
// =============================================================================

/**
 * Canonicalize a desktop accessibility snapshot.
 *
 * Normalizes all fields to produce a deterministic representation:
 * - `app_name`: Lowercase, trimmed
 * - `window_title`: Text normalization (capped at 100 chars)
 * - `focused_path`: Built from focused element info
 * - `tree_hash`: SHA-256 of canonical tree JSON
 *
 * @param snapshot - Raw desktop accessibility snapshot
 * @returns Canonical snapshot for hashing
 */
export function canonicalizeDesktopSnapshot(
  snapshot: DesktopAccessibilitySnapshot,
): CanonicalDesktopSnapshot {
  const platform = snapshot.platform ?? detectPlatform();

  // Canonicalize the UI tree if present
  let treeHash: string;
  if (snapshot.ui_tree) {
    const canonicalTree = canonicalizeAccessibilityNode(snapshot.ui_tree);
    treeHash = sha256(JSON.stringify(canonicalTree));
  } else if (snapshot.ui_tree_text) {
    // Fallback: hash the raw text if no structured tree
    treeHash = sha256(normalizeText(snapshot.ui_tree_text, 10000));
  } else {
    treeHash = sha256("");
  }

  return {
    app_name_norm: normalizeText(snapshot.app_name),
    window_title_norm: normalizeText(snapshot.window_title, MAX_WINDOW_TITLE_LENGTH),
    focused_path: buildFocusedPath(snapshot.focused_role, snapshot.focused_name),
    tree_hash: treeHash,
    platform,
  };
}

/**
 * Compute state hash for a desktop accessibility snapshot.
 *
 * The hash includes all canonical fields in a deterministic order.
 * Platform is included because different platforms have different
 * accessibility APIs and security contexts.
 *
 * @param snapshot - Raw or canonical desktop snapshot
 * @returns SHA-256 hash prefixed with "sha256:"
 */
export function computeDesktopStateHash(
  snapshot: DesktopAccessibilitySnapshot | CanonicalDesktopSnapshot,
): string {
  // Canonicalize if not already canonical
  const canonical = isCanonicalDesktopSnapshot(snapshot)
    ? snapshot
    : canonicalizeDesktopSnapshot(snapshot);

  // Build deterministic JSON (sorted keys)
  const hashInput = JSON.stringify({
    app_name_norm: canonical.app_name_norm,
    focused_path: canonical.focused_path,
    platform: canonical.platform,
    tree_hash: canonical.tree_hash,
    window_title_norm: canonical.window_title_norm,
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
function isCanonicalDesktopSnapshot(
  snapshot: DesktopAccessibilitySnapshot | CanonicalDesktopSnapshot,
): snapshot is CanonicalDesktopSnapshot {
  return (
    "app_name_norm" in snapshot &&
    "window_title_norm" in snapshot &&
    "focused_path" in snapshot &&
    "tree_hash" in snapshot
  );
}

// =============================================================================
// Schema Version
// =============================================================================

/**
 * Current schema version for desktop canonicalization.
 *
 * Increment major version for breaking changes to canonical format.
 * Increment minor version for additions that don't change existing hashes.
 */
export const DESKTOP_SCHEMA_VERSION = "desktop:v1.0";
