import type { ActionRequest } from "../contracts/action-request.js";
import type { AuthorizationReason } from "../contracts/enums.js";
import type { PolicyRule } from "../contracts/policy-rule.js";
import { isLabelPassed } from "../contracts/verification.js";
import { effectiveMaxDelegationDepth, matchesRule } from "./matching.js";

export interface PolicyMatchResult {
  allowed: boolean;
  reason: AuthorizationReason;
  matched_rule?: string | null;
  missing_labels?: string[];
}

export class PolicyEngine {
  private rules: PolicyRule[];
  private globalMaxDelegationDepth: number | null;

  constructor(rules: PolicyRule[], globalMaxDelegationDepth?: number | null) {
    this.rules = rules;
    this.globalMaxDelegationDepth = globalMaxDelegationDepth ?? null;
  }

  replaceRules(rules: PolicyRule[]): void {
    this.rules = rules;
  }

  setGlobalMaxDelegationDepth(maxDepth: number | null): void {
    this.globalMaxDelegationDepth = maxDepth;
  }

  replacePolicy(rules: PolicyRule[], globalMaxDelegationDepth: number | null): void {
    this.rules = rules;
    this.globalMaxDelegationDepth = globalMaxDelegationDepth;
  }

  evaluate(request: ActionRequest, delegationDepth = 0): PolicyMatchResult {
    const matchingRules = this.rules.filter((rule) => matchesRule(rule, request));
    if (matchingRules.length === 0) {
      return {
        allowed: false,
        reason: "no_matching_policy",
      };
    }

    for (const rule of matchingRules) {
      if (rule.effect === "deny") {
        return {
          allowed: false,
          reason: "explicit_deny",
          matched_rule: rule.name,
        };
      }
    }

    let firstAllowFailure: PolicyMatchResult | null = null;
    for (const rule of matchingRules) {
      if (rule.effect !== "allow") {
        continue;
      }

      const effectiveMaxDepth = effectiveMaxDelegationDepth(
        this.globalMaxDelegationDepth,
        rule.max_delegation_depth,
      );
      if (effectiveMaxDepth !== null && delegationDepth > effectiveMaxDepth) {
        const failure: PolicyMatchResult = {
          allowed: false,
          reason: "max_delegation_depth_exceeded",
          matched_rule: rule.name,
        };
        if (firstAllowFailure === null) {
          firstAllowFailure = failure;
        }
        continue;
      }

      const missingLabels = (rule.required_labels ?? []).filter(
        (label) => !isLabelPassed(request.verification_evidence, label),
      );
      if (missingLabels.length > 0) {
        const failure: PolicyMatchResult = {
          allowed: false,
          reason: "missing_required_verification",
          matched_rule: rule.name,
          missing_labels: missingLabels,
        };
        if (firstAllowFailure === null) {
          firstAllowFailure = failure;
        }
        continue;
      }

      return {
        allowed: true,
        reason: "allowed",
        matched_rule: rule.name,
      };
    }

    if (firstAllowFailure !== null) {
      return firstAllowFailure;
    }

    return {
      allowed: false,
      reason: "no_matching_policy",
    };
  }
}
