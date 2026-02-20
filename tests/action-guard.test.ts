import { describe, expect, it } from "vitest";
import {
  ActionGuard,
  AuthorizationDeniedError,
  type ActionRequest,
  type PolicyRule,
  PolicyEngine,
  type SignedMandate,
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

function allowRule(): PolicyRule {
  return {
    name: "allow-transfers",
    effect: "allow",
    principals: ["agent:*"],
    actions: ["http.post"],
    resources: ["https://finance.example.com/*"],
    required_labels: ["verified:user_presence"],
  };
}

describe("ActionGuard", () => {
  it("returns deny decision from policy evaluation", () => {
    const engine = new PolicyEngine([]);
    const guard = new ActionGuard({ policyEngine: engine });

    const decision = guard.authorize(requestBase());
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("no_matching_policy");
    expect(decision.mandate).toBeNull();
  });

  it("returns allow decision and mandate when issuer is configured", () => {
    const engine = new PolicyEngine([allowRule()]);
    const mandate: SignedMandate = {
      token: "header.payload.sig",
      signature: "sig",
      claims: {
        mandate_id: "mdt_1",
        principal_id: "agent:payments",
        action: "http.post",
        resource: "https://finance.example.com/transfers",
        intent_hash: "ih_1",
        state_hash: "sh_1",
        issued_at_epoch_s: 1,
        expires_at_epoch_s: 2,
      },
    };
    const guard = new ActionGuard({
      policyEngine: engine,
      mandateIssuer: () => mandate,
    });

    const decision = guard.authorize(requestBase());
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("allowed");
    expect(decision.mandate).toEqual(mandate);
  });

  it("enforce executes action when allowed", () => {
    const engine = new PolicyEngine([allowRule()]);
    const guard = new ActionGuard({ policyEngine: engine });
    const result = guard.enforce(() => "ok", requestBase());
    expect(result.value).toBe("ok");
    expect(result.decision.allowed).toBe(true);
  });

  it("enforce throws AuthorizationDeniedError when denied", () => {
    const engine = new PolicyEngine([]);
    const guard = new ActionGuard({ policyEngine: engine });
    expect(() => guard.enforce(() => "ok", requestBase())).toThrowError(
      AuthorizationDeniedError,
    );
  });
});
