import type { ActionRequest } from "../contracts/action-request.js";
import type { PolicyRule } from "../contracts/policy-rule.js";

export function matchesRule(rule: PolicyRule, request: ActionRequest): boolean {
  const principal = request.principal.principal_id;
  const action = request.action_spec.action;
  const resource = request.action_spec.resource;
  const principalOk = rule.principals.some((pattern) => globMatch(principal, pattern));
  const actionOk = rule.actions.some((pattern) => globMatch(action, pattern));
  const resourceOk = rule.resources.some((pattern) => globMatch(resource, pattern));
  return principalOk && actionOk && resourceOk;
}

export function effectiveMaxDelegationDepth(
  globalMax: number | null | undefined,
  ruleMax: number | null | undefined,
): number | null {
  const g = globalMax ?? null;
  const r = ruleMax ?? null;
  if (g === null) {
    return r;
  }
  if (r === null) {
    return g;
  }
  return Math.min(g, r);
}

// Minimal fnmatch-like matcher for parity with Python rule patterns.
export function globMatch(value: string, pattern: string): boolean {
  const regex = globToRegExp(pattern);
  return regex.test(value);
}

function globToRegExp(pattern: string): RegExp {
  let out = "^";
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch === "*") {
      out += ".*";
    } else if (ch === "?") {
      out += ".";
    } else {
      out += escapeRegexChar(ch);
    }
  }
  out += "$";
  return new RegExp(out);
}

function escapeRegexChar(ch: string): string {
  return /[\\^$.*+?()[\]{}|]/.test(ch) ? `\\${ch}` : ch;
}
