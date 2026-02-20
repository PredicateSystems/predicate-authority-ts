import type { StateEvidence } from "../contracts/action-request.js";

export interface WebStateSnapshot {
  url?: string;
  title?: string;
  dom_hash?: string;
  visible_text_hash?: string;
  event_id?: string;
  observed_at?: string;
  dominant_group_key?: string;
  snapshot_timestamp?: string;
  confidence?: number;
  confidence_reasons?: string[];
}

export interface RuntimeSnapshotLike {
  url?: string;
  timestamp?: string;
  dominant_group_key?: string;
  diagnostics?: {
    confidence?: number | null;
    reasons?: string[];
  };
}

export interface WebStateEvidenceOptions {
  snapshot: WebStateSnapshot;
  stateHash?: string;
  schemaVersion?: string;
  confidence?: number;
  hasher?: (material: string) => string;
}

export function buildWebStateEvidence(options: WebStateEvidenceOptions): StateEvidence {
  const stateHash = options.stateHash ?? hashWebSnapshotMaterial(materializeSnapshot(options.snapshot), options.hasher);
  return {
    source: "browser",
    state_hash: stateHash,
    schema_version: options.schemaVersion ?? "web-v1",
    confidence: options.confidence ?? options.snapshot.confidence,
  };
}

export function webStateSnapshotFromRuntimeSnapshot(snapshot: RuntimeSnapshotLike): WebStateSnapshot {
  return {
    url: snapshot.url,
    observed_at: snapshot.timestamp,
    snapshot_timestamp: snapshot.timestamp,
    dominant_group_key: snapshot.dominant_group_key,
    confidence: snapshot.diagnostics?.confidence ?? undefined,
    confidence_reasons: snapshot.diagnostics?.reasons,
  };
}

export function buildWebStateEvidenceFromRuntimeSnapshot(
  snapshot: RuntimeSnapshotLike,
  options?: Omit<WebStateEvidenceOptions, "snapshot" | "confidence">,
): StateEvidence {
  const mapped = webStateSnapshotFromRuntimeSnapshot(snapshot);
  return buildWebStateEvidence({
    snapshot: mapped,
    stateHash: options?.stateHash,
    schemaVersion: options?.schemaVersion,
    hasher: options?.hasher,
    confidence: mapped.confidence,
  });
}

function materializeSnapshot(snapshot: WebStateSnapshot): string {
  return JSON.stringify({
    confidence: snapshot.confidence ?? "",
    confidence_reasons: snapshot.confidence_reasons ?? [],
    dom_hash: snapshot.dom_hash ?? "",
    dominant_group_key: snapshot.dominant_group_key ?? "",
    event_id: snapshot.event_id ?? "",
    observed_at: snapshot.observed_at ?? "",
    snapshot_timestamp: snapshot.snapshot_timestamp ?? "",
    title: snapshot.title ?? "",
    url: snapshot.url ?? "",
    visible_text_hash: snapshot.visible_text_hash ?? "",
  });
}

function hashWebSnapshotMaterial(material: string, hasher?: (material: string) => string): string {
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
