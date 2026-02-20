import { describe, expect, it } from "vitest";
import {
  effectiveMaxDelegationDepth,
  globMatch,
  matchesRule,
  type ActionRequest,
  type PolicyRule,
} from "../src/index.js";

describe("policy matching parity helpers", () => {
  it("supports wildcard glob matching for principal/action/resource", () => {
    expect(globMatch("agent:payments", "agent:*")).toBe(true);
    expect(globMatch("http.post", "http.*")).toBe(true);
    expect(globMatch("https://a.example.com/path", "https://*.example.com/*")).toBe(true);
    expect(globMatch("agent:orders", "agent:payments")).toBe(false);
  });

  it("matches rule only when principal, action, and resource all match", () => {
    const rule: PolicyRule = {
      name: "allow-payment-submit",
      effect: "allow",
      principals: ["agent:payments*"],
      actions: ["http.post"],
      resources: ["https://finance.example.com/*"],
      required_labels: ["verified:user_presence"],
    };
    const request: ActionRequest = {
      principal: { principal_id: "agent:payments" },
      action_spec: {
        action: "http.post",
        resource: "https://finance.example.com/transfers",
        intent: "submit transfer",
      },
      state_evidence: { source: "browser", state_hash: "state_abc" },
      verification_evidence: { signals: [] },
    };

    expect(matchesRule(rule, request)).toBe(true);
    expect(
      matchesRule(
        { ...rule, actions: ["http.get"] },
        request,
      ),
    ).toBe(false);
    expect(
      matchesRule(
        { ...rule, resources: ["https://billing.example.com/*"] },
        request,
      ),
    ).toBe(false);
  });

  it("computes effective max delegation depth with python parity", () => {
    expect(effectiveMaxDelegationDepth(null, null)).toBe(null);
    expect(effectiveMaxDelegationDepth(null, 3)).toBe(3);
    expect(effectiveMaxDelegationDepth(2, null)).toBe(2);
    expect(effectiveMaxDelegationDepth(5, 2)).toBe(2);
  });
});
