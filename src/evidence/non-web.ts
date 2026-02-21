import {
  type DesktopAccessibilitySnapshot as CanonicalDesktopInput,
  type TerminalSessionSnapshot as CanonicalTerminalInput,
  DESKTOP_SCHEMA_VERSION,
  TERMINAL_SCHEMA_VERSION,
  canonicalizeDesktopSnapshot,
  canonicalizeTerminalSnapshot,
  computeDesktopStateHash,
  computeTerminalStateHash,
} from "../canonicalization/index.js";
import type { StateEvidence, VerificationEvidence, VerificationSignal } from "../contracts/action-request.js";

export type EvidenceHasher = (material: string) => string;

export interface TerminalSessionSnapshot {
  session_id?: string;
  terminal_id?: string;
  cwd?: string;
  command?: string;
  transcript_hash?: string;
  observed_at?: string;
  confidence?: number;
}

export interface DesktopAccessibilitySnapshot {
  app_name?: string;
  window_title?: string;
  focused_role?: string;
  focused_name?: string;
  ui_tree_hash?: string;
  observed_at?: string;
  confidence?: number;
}

// Contract-only adapter interfaces. Runtime implementations are Phase 4.
export interface TerminalEvidenceProvider {
  captureTerminalSnapshot(): Promise<TerminalSessionSnapshot> | TerminalSessionSnapshot;
}

export interface DesktopAccessibilityEvidenceProvider {
  captureAccessibilitySnapshot():
    | Promise<DesktopAccessibilitySnapshot>
    | DesktopAccessibilitySnapshot;
}

export interface VerificationSignalProvider {
  collectVerificationSignals(): Promise<VerificationSignal[]> | VerificationSignal[];
}

export interface TerminalStateEvidenceOptions {
  snapshot: TerminalSessionSnapshot;
  stateHash?: string;
  schemaVersion?: string;
  confidence?: number;
  hasher?: EvidenceHasher;
  /**
   * Use canonical hashing with proper normalization.
   * When true, applies ANSI stripping, timestamp normalization, whitespace
   * collapsing, and other canonicalization rules for reproducible hashes.
   * @default false (legacy mode for backward compatibility)
   */
  useCanonicalHash?: boolean;
}

export interface DesktopStateEvidenceOptions {
  snapshot: DesktopAccessibilitySnapshot;
  stateHash?: string;
  schemaVersion?: string;
  confidence?: number;
  hasher?: EvidenceHasher;
  /**
   * Use canonical hashing with proper normalization.
   * When true, applies text normalization, tree sorting, and other
   * canonicalization rules for reproducible hashes.
   * @default false (legacy mode for backward compatibility)
   */
  useCanonicalHash?: boolean;
}

export function buildTerminalStateEvidence(options: TerminalStateEvidenceOptions): StateEvidence {
  let stateHash: string;
  let schemaVersion: string;

  if (options.useCanonicalHash) {
    // Use canonical hashing with proper normalization
    const canonicalInput: CanonicalTerminalInput = {
      session_id: options.snapshot.session_id ?? "",
      terminal_id: options.snapshot.terminal_id,
      cwd: options.snapshot.cwd,
      command: options.snapshot.command,
      transcript: options.snapshot.transcript_hash, // Note: expects raw transcript, not pre-hashed
    };
    stateHash = options.stateHash ?? computeTerminalStateHash(canonicalInput);
    schemaVersion = options.schemaVersion ?? TERMINAL_SCHEMA_VERSION;
  } else {
    // Legacy mode for backward compatibility
    stateHash = options.stateHash ?? hashMaterial(materializeTerminalSnapshot(options.snapshot), options.hasher);
    schemaVersion = options.schemaVersion ?? "terminal-v1";
  }

  return {
    source: "terminal",
    state_hash: stateHash,
    schema_version: schemaVersion,
    confidence: options.confidence ?? options.snapshot.confidence,
  };
}

export function buildDesktopAccessibilityStateEvidence(
  options: DesktopStateEvidenceOptions,
): StateEvidence {
  let stateHash: string;
  let schemaVersion: string;

  if (options.useCanonicalHash) {
    // Use canonical hashing with proper normalization
    const canonicalInput: CanonicalDesktopInput = {
      app_name: options.snapshot.app_name,
      window_title: options.snapshot.window_title,
      focused_role: options.snapshot.focused_role,
      focused_name: options.snapshot.focused_name,
      ui_tree_text: options.snapshot.ui_tree_hash, // Note: expects raw text, not pre-hashed
    };
    stateHash = options.stateHash ?? computeDesktopStateHash(canonicalInput);
    schemaVersion = options.schemaVersion ?? DESKTOP_SCHEMA_VERSION;
  } else {
    // Legacy mode for backward compatibility
    stateHash = options.stateHash ?? hashMaterial(materializeDesktopSnapshot(options.snapshot), options.hasher);
    schemaVersion = options.schemaVersion ?? "desktop-a11y-v1";
  }

  return {
    source: "desktop_accessibility",
    state_hash: stateHash,
    schema_version: schemaVersion,
    confidence: options.confidence ?? options.snapshot.confidence,
  };
}

export async function collectVerificationEvidence(
  provider: VerificationSignalProvider,
): Promise<VerificationEvidence> {
  return { signals: await provider.collectVerificationSignals() };
}

function materializeTerminalSnapshot(snapshot: TerminalSessionSnapshot): string {
  return JSON.stringify({
    command: snapshot.command ?? "",
    confidence: snapshot.confidence ?? "",
    cwd: snapshot.cwd ?? "",
    observed_at: snapshot.observed_at ?? "",
    session_id: snapshot.session_id ?? "",
    terminal_id: snapshot.terminal_id ?? "",
    transcript_hash: snapshot.transcript_hash ?? "",
  });
}

function materializeDesktopSnapshot(snapshot: DesktopAccessibilitySnapshot): string {
  return JSON.stringify({
    app_name: snapshot.app_name ?? "",
    confidence: snapshot.confidence ?? "",
    focused_name: snapshot.focused_name ?? "",
    focused_role: snapshot.focused_role ?? "",
    observed_at: snapshot.observed_at ?? "",
    ui_tree_hash: snapshot.ui_tree_hash ?? "",
    window_title: snapshot.window_title ?? "",
  });
}

function hashMaterial(material: string, hasher?: EvidenceHasher): string {
  if (hasher) {
    return hasher(material);
  }
  return `sh_${fnv1a32Hex(material)}`;
}

function fnv1a32Hex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
