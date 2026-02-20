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
