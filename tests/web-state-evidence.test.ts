import { describe, expect, it } from "vitest";
import {
  buildWebStateEvidence,
  buildWebStateEvidenceFromRuntimeSnapshot,
  webStateSnapshotFromRuntimeSnapshot,
} from "../src/index.js";

describe("buildWebStateEvidence", () => {
  it("uses explicit state hash when provided", () => {
    const evidence = buildWebStateEvidence({
      snapshot: {
        url: "https://example.com/payments",
        dom_hash: "dom_abc",
      },
      stateHash: "state_external_123",
    });

    expect(evidence.source).toBe("browser");
    expect(evidence.state_hash).toBe("state_external_123");
    expect(evidence.schema_version).toBe("web-v1");
  });

  it("computes deterministic hash from snapshot fields", () => {
    const a = buildWebStateEvidence({
      snapshot: {
        url: "https://example.com/payments",
        title: "Payments",
        dom_hash: "dom_abc",
        visible_text_hash: "txt_123",
      },
    });
    const b = buildWebStateEvidence({
      snapshot: {
        url: "https://example.com/payments",
        title: "Payments",
        dom_hash: "dom_abc",
        visible_text_hash: "txt_123",
      },
    });

    expect(a.state_hash).toMatch(/^sh_[a-f0-9]{8}$/);
    expect(a.state_hash).toBe(b.state_hash);
  });

  it("supports custom hasher injection for web runtimes", () => {
    const evidence = buildWebStateEvidence({
      snapshot: {
        url: "https://example.com/orders",
        event_id: "evt_1",
      },
      hasher: (material) => `custom_${material.length}`,
      schemaVersion: "web-v2",
      confidence: 0.95,
    });

    expect(evidence.state_hash).toMatch(/^custom_[0-9]+$/);
    expect(evidence.schema_version).toBe("web-v2");
    expect(evidence.confidence).toBe(0.95);
  });

  it("maps sdk-ts runtime snapshot metadata into web state snapshot", () => {
    const mapped = webStateSnapshotFromRuntimeSnapshot({
      url: "https://example.com/checkout",
      timestamp: "2026-02-20T00:00:00.000Z",
      dominant_group_key: "main_results",
      diagnostics: {
        confidence: 0.82,
        reasons: ["stable_dom", "high_signal_density"],
      },
    });

    expect(mapped.url).toBe("https://example.com/checkout");
    expect(mapped.observed_at).toBe("2026-02-20T00:00:00.000Z");
    expect(mapped.snapshot_timestamp).toBe("2026-02-20T00:00:00.000Z");
    expect(mapped.dominant_group_key).toBe("main_results");
    expect(mapped.confidence).toBe(0.82);
    expect(mapped.confidence_reasons).toEqual(["stable_dom", "high_signal_density"]);
  });

  it("builds state evidence directly from sdk-ts runtime snapshot shape", () => {
    const evidence = buildWebStateEvidenceFromRuntimeSnapshot(
      {
        url: "https://example.com/checkout",
        timestamp: "2026-02-20T00:00:00.000Z",
        diagnostics: { confidence: 0.74, reasons: ["dom_ready"] },
      },
      {
        hasher: (material) => `runtime_${material.length}`,
      },
    );

    expect(evidence.source).toBe("browser");
    expect(evidence.state_hash).toMatch(/^runtime_[0-9]+$/);
    expect(evidence.confidence).toBe(0.74);
    expect(evidence.schema_version).toBe("web-v1");
  });
});
