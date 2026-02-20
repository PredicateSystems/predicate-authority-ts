import type { AuthorizationReason } from "./enums.js";
import { type SignedMandate, isSignedMandate } from "./mandate.js";

export interface AuthorizationDecision {
  allowed: boolean;
  reason: AuthorizationReason | string;
  mandate?: SignedMandate | null;
  violated_rule?: string | null;
  missing_labels?: string[];
}

export function isAuthorizationDecision(value: unknown): value is AuthorizationDecision {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.allowed === "boolean" &&
    typeof obj.reason === "string" &&
    (obj.mandate === undefined || obj.mandate === null || isSignedMandate(obj.mandate)) &&
    (obj.violated_rule === undefined ||
      obj.violated_rule === null ||
      typeof obj.violated_rule === "string") &&
    (obj.missing_labels === undefined ||
      (Array.isArray(obj.missing_labels) &&
        obj.missing_labels.every((label) => typeof label === "string")))
  );
}
