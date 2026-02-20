import { describe, expect, it } from "vitest";
import {
  type ActionRequest,
  PolicyEngine,
  type PolicyRule,
} from "../src/index.js";

function requestBase(): ActionRequest {
  return {
    principal: { principal_id: "agent:payments" },
    action_spec: {
      action: "http.post",
      resource: "https://finance.example.com/transfers",
      intent: "submit transfer",
    },
    state_evidence: {
      source: "browser",
      state_hash: "state_123",
    },
    verification_evidence: {
      signals: [{ label: "verified:user_presence", status: "passed" }],
    },
  };
}

describe("PolicyEngine parity behavior", () => {
  it("returns no_matching_policy when nothing matches", () => {
    const engine = new PolicyEngine([]);
    const result = engine.evaluate(requestBase());
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("no_matching_policy");
  });

  it("applies explicit deny precedence over allow", () => {
    const rules: PolicyRule[] = [
      {
        name: "allow-transfers",
        effect: "allow",
        principals: ["agent:*"],
        actions: ["http.post"],
        resources: ["https://finance.example.com/*"],
      },
      {
        name: "deny-all-posts",
        effect: "deny",
        principals: ["agent:*"],
        actions: ["http.post"],
        resources: ["https://finance.example.com/*"],
      },
    ];
    const engine = new PolicyEngine(rules);
    const result = engine.evaluate(requestBase());
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("explicit_deny");
    expect(result.matched_rule).toBe("deny-all-posts");
  });

  it("returns missing_required_verification with missing labels", () => {
    const rules: PolicyRule[] = [
      {
        name: "allow-with-label",
        effect: "allow",
        principals: ["agent:*"],
        actions: ["http.post"],
        resources: ["https://finance.example.com/*"],
        required_labels: ["verified:user_presence", "verified:captcha"],
      },
    ];
    const engine = new PolicyEngine(rules);
    const result = engine.evaluate(requestBase());
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("missing_required_verification");
    expect(result.matched_rule).toBe("allow-with-label");
    expect(result.missing_labels).toEqual(["verified:captcha"]);
  });

  it("returns max_delegation_depth_exceeded when above effective max", () => {
    const rules: PolicyRule[] = [
      {
        name: "allow-depth-limited",
        effect: "allow",
        principals: ["agent:*"],
        actions: ["http.post"],
        resources: ["https://finance.example.com/*"],
        max_delegation_depth: 1,
      },
    ];
    const engine = new PolicyEngine(rules, 2);
    const result = engine.evaluate(requestBase(), 3);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("max_delegation_depth_exceeded");
    expect(result.matched_rule).toBe("allow-depth-limited");
  });

  it("returns allowed when matching allow rule passes checks", () => {
    const rules: PolicyRule[] = [
      {
        name: "allow-transfers",
        effect: "allow",
        principals: ["agent:*"],
        actions: ["http.post"],
        resources: ["https://finance.example.com/*"],
        required_labels: ["verified:user_presence"],
      },
    ];
    const engine = new PolicyEngine(rules);
    const result = engine.evaluate(requestBase(), 0);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("allowed");
    expect(result.matched_rule).toBe("allow-transfers");
  });
});
