/**
 * Resource comparison functions for post-execution verification.
 *
 * These functions compare authorized resources against actual resources,
 * handling path normalization and glob pattern matching.
 */

import { normalizePath } from "../canonicalization/utils.js";
import { globMatch } from "../policy/matching.js";

/**
 * Options for resource matching.
 */
export interface ResourceMatchOptions {
  /** Enable glob pattern matching for authorized resource */
  allowGlob?: boolean;
}

/**
 * Normalize a resource path for comparison.
 *
 * Applies the following transformations:
 * - Expands ~ to home directory
 * - Collapses multiple slashes
 * - Removes ./ segments
 * - Removes trailing slashes
 * - Resolves . and ..
 *
 * @param resource - Resource path to normalize
 * @returns Normalized path
 */
export function normalizeResource(resource: string): string {
  // Use existing normalizePath for filesystem paths
  if (resource.startsWith("/") || resource.startsWith("~") || resource.startsWith(".")) {
    let normalized = normalizePath(resource);
    // normalizePath doesn't strip trailing slashes, so we do it here
    if (normalized.length > 1 && normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  }

  // For URLs, handle protocol specially
  const urlMatch = resource.match(/^([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)/);
  if (urlMatch) {
    const protocol = urlMatch[1]; // e.g., "https://"
    const rest = resource.slice(protocol.length);

    // Normalize the rest (collapse slashes, remove ./, remove trailing /)
    const normalized = rest
      .replace(/\/+/g, "/") // Collapse multiple slashes
      .replace(/\/\.\//g, "/") // Remove ./
      .replace(/\/$/g, ""); // Remove trailing slash

    return protocol + normalized;
  }

  // For other non-path resources, do basic cleanup
  return resource
    .replace(/\/+/g, "/") // Collapse multiple slashes
    .replace(/\/\.\//g, "/") // Remove ./
    .replace(/\/$/g, ""); // Remove trailing slash
}

/**
 * Check if an actual resource matches an authorized resource.
 *
 * Handles:
 * - Path normalization (~ expansion, . and .., etc.)
 * - Optional glob pattern matching (* wildcards)
 *
 * @param authorized - Resource from the mandate (may contain glob patterns)
 * @param actual - Resource that was actually accessed
 * @param options - Matching options
 * @returns True if resources match
 */
export function resourcesMatch(
  authorized: string,
  actual: string,
  options: ResourceMatchOptions = {},
): boolean {
  const { allowGlob = true } = options;

  // Normalize both resources
  const normalizedAuth = normalizeResource(authorized);
  const normalizedActual = normalizeResource(actual);

  // Exact match after normalization
  if (normalizedAuth === normalizedActual) {
    return true;
  }

  // Glob pattern match (if enabled and authorized resource contains wildcards)
  if (allowGlob && authorized.includes("*")) {
    return globMatch(normalizedActual, authorized);
  }

  return false;
}

/**
 * Check if an actual action matches an authorized action.
 *
 * Actions are compared case-sensitively after trimming whitespace.
 * Supports glob patterns in the authorized action.
 *
 * @param authorized - Action from the mandate (may contain glob patterns)
 * @param actual - Action that was actually performed
 * @returns True if actions match
 */
export function actionsMatch(authorized: string, actual: string): boolean {
  const normalizedAuth = authorized.trim();
  const normalizedActual = actual.trim();

  // Exact match
  if (normalizedAuth === normalizedActual) {
    return true;
  }

  // Glob pattern match (e.g., "fs.*" matches "fs.read")
  if (authorized.includes("*")) {
    return globMatch(normalizedActual, authorized);
  }

  return false;
}
