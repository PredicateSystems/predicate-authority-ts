export type AuthorizationReason =
  | "allowed"
  | "no_matching_policy"
  | "explicit_deny"
  | "missing_required_verification"
  | "max_delegation_depth_exceeded"
  | "invalid_mandate"
  | "rate_limit_exceeded";

export interface AuthorizationRequest {
  principal: string;
  action: string;
  resource: string;
  intent_hash?: string;
  context?: Record<string, unknown>;
  labels?: string[];
}

export interface AuthorizationResponse {
  allowed: boolean;
  reason: AuthorizationReason | string;
  mandate_id: string | null;
  violated_rule: string | null;
  missing_labels: string[];
}

export function isAuthorizationResponse(value: unknown): value is AuthorizationResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.allowed === "boolean" &&
    typeof obj.reason === "string" &&
    (obj.mandate_id === null || typeof obj.mandate_id === "string") &&
    (obj.violated_rule === null || typeof obj.violated_rule === "string") &&
    Array.isArray(obj.missing_labels) &&
    obj.missing_labels.every((label) => typeof label === "string")
  );
}
