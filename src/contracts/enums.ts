export const AUTHORIZATION_REASONS = [
  "allowed",
  "no_matching_policy",
  "explicit_deny",
  "missing_required_verification",
  "max_delegation_depth_exceeded",
  "invalid_mandate",
  "rate_limit_exceeded",
] as const;

export type AuthorizationReason = (typeof AUTHORIZATION_REASONS)[number];

export const VERIFICATION_STATUSES = ["passed", "failed", "skipped"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const POLICY_EFFECTS = ["allow", "deny"] as const;
export type PolicyEffect = (typeof POLICY_EFFECTS)[number];
