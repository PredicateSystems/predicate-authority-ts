import type { ActionRequest } from "../contracts/action-request.js";
import type { PolicyEngine } from "../policy/engine.js";
import type { AuthorizationDecision, SignedMandate } from "../types.js";

export class AuthorizationDeniedError extends Error {
  readonly decision: AuthorizationDecision;

  constructor(decision: AuthorizationDecision) {
    super(`authority denied: ${decision.reason}`);
    this.name = "AuthorizationDeniedError";
    this.decision = decision;
  }
}

export interface ActionExecutionResult<T> {
  value: T;
  decision: AuthorizationDecision;
  mandate: SignedMandate | null;
}

export interface ActionGuardOptions {
  policyEngine: PolicyEngine;
  mandateIssuer?: (request: ActionRequest) => SignedMandate;
}

export class ActionGuard {
  private readonly policyEngine: PolicyEngine;
  private readonly mandateIssuer?: (request: ActionRequest) => SignedMandate;

  constructor(options: ActionGuardOptions) {
    this.policyEngine = options.policyEngine;
    this.mandateIssuer = options.mandateIssuer;
  }

  authorize(request: ActionRequest, delegationDepth = 0): AuthorizationDecision {
    const evaluation = this.policyEngine.evaluate(request, delegationDepth);
    if (!evaluation.allowed) {
      return {
        allowed: false,
        reason: evaluation.reason,
        violated_rule: evaluation.matched_rule ?? null,
        missing_labels: evaluation.missing_labels ?? [],
        mandate: null,
      };
    }

    const mandate = this.mandateIssuer ? this.mandateIssuer(request) : null;
    return {
      allowed: true,
      reason: "allowed",
      violated_rule: evaluation.matched_rule ?? null,
      missing_labels: [],
      mandate,
    };
  }

  enforce<T>(action: () => T, request: ActionRequest, delegationDepth = 0): ActionExecutionResult<T> {
    const decision = this.authorize(request, delegationDepth);
    if (!decision.allowed) {
      throw new AuthorizationDeniedError(decision);
    }
    const value = action();
    return {
      value,
      decision,
      mandate: decision.mandate ?? null,
    };
  }
}
