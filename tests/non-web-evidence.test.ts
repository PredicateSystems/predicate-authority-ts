import { describe, expect, it } from "vitest";
import {
  buildDesktopAccessibilityStateEvidence,
  buildTerminalStateEvidence,
  collectVerificationEvidence,
} from "../src/index.js";

describe("non-web evidence helpers", () => {
  it("builds terminal state evidence from snapshot", () => {
    const evidence = buildTerminalStateEvidence({
      snapshot: {
        session_id: "sess-1",
        cwd: "/tmp",
        command: "npm test",
        transcript_hash: "tx_123",
        confidence: 0.8,
      },
    });
    expect(evidence.source).toBe("terminal");
    expect(evidence.schema_version).toBe("terminal-v1");
    expect(evidence.state_hash).toMatch(/^sh_[a-f0-9]{8}$/);
    expect(evidence.confidence).toBe(0.8);
  });

  it("builds desktop accessibility evidence with explicit hash override", () => {
    const evidence = buildDesktopAccessibilityStateEvidence({
      snapshot: {
        app_name: "Chrome",
        window_title: "Payments",
        focused_role: "button",
        ui_tree_hash: "ui_abc",
      },
      stateHash: "state_a11y_1",
    });
    expect(evidence.source).toBe("desktop_accessibility");
    expect(evidence.state_hash).toBe("state_a11y_1");
    expect(evidence.schema_version).toBe("desktop-a11y-v1");
  });

  it("collects verification evidence from provider contract", async () => {
    const evidence = await collectVerificationEvidence({
      collectVerificationSignals: () => [
        { label: "verified:user_presence", status: "passed" },
        { label: "verified:terminal_attested", status: "passed" },
      ],
    });
    expect(evidence.signals).toHaveLength(2);
    expect(evidence.signals?.[1].label).toBe("verified:terminal_attested");
  });
});
