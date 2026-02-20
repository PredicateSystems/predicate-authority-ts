export type {
  ActionRequest,
  ActionSpec,
  AuthorizeRequest,
  PrincipalRef,
  SidecarAuthorizeRequest,
  StateEvidence,
  VerificationEvidence,
  VerificationSignal,
} from "./contracts/action-request.js";
export { toSidecarAuthorizeRequest } from "./contracts/action-request.js";
export type { AuthorizationResponse } from "./contracts/decision.js";
export { isAuthorizationResponse } from "./contracts/decision.js";
export type { AuthorizationReason, PolicyEffect, VerificationStatus } from "./contracts/enums.js";
export { AUTHORIZATION_REASONS, POLICY_EFFECTS, VERIFICATION_STATUSES } from "./contracts/enums.js";
export type { PolicyRule } from "./contracts/policy-rule.js";
export { isPolicyRule } from "./contracts/policy-rule.js";
export type { ProofEvent } from "./contracts/proof-event.js";
export { isProofEvent } from "./contracts/proof-event.js";

// Backward-compatible alias for the initial scaffold API.
export type { SidecarAuthorizeRequest as AuthorizationRequest } from "./contracts/action-request.js";
