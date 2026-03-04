export type {
  ActionRequest,
  ActionSpec,
  AuthorizeRequest,
  PrincipalRef,
  SidecarAuthorizeRequest,
  StateEvidence,
  VerificationEvidence,
  VerificationSignal,
} from "./action-request.js";
export { toSidecarAuthorizeRequest } from "./action-request.js";
export type { AuthorizationResponse } from "./decision.js";
export { isAuthorizationResponse } from "./decision.js";
export type { AuthorizationDecision } from "./authorization-decision.js";
export { isAuthorizationDecision } from "./authorization-decision.js";
export type { AuthorizationReason, PolicyEffect, VerificationStatus } from "./enums.js";
export { AUTHORIZATION_REASONS, POLICY_EFFECTS, VERIFICATION_STATUSES } from "./enums.js";
export type { MandateClaims, SignedMandate } from "./mandate.js";
export { isMandateClaims, isSignedMandate } from "./mandate.js";
export type { PolicyRule } from "./policy-rule.js";
export { isPolicyRule } from "./policy-rule.js";
export type { ProofEvent } from "./proof-event.js";
export { isProofEvent } from "./proof-event.js";
export { isLabelPassed, passedLabels } from "./verification.js";

// Execute types for Phase 5: Execution Proxying (Zero-Trust)
export type {
  ExecuteRequest,
  ExecutePayload,
  FileWritePayload,
  CliExecPayload,
  HttpFetchPayload,
  FileDeletePayload,
  EnvReadPayload,
  ExecuteResponse,
  ExecuteResult,
  FileReadResult,
  FileWriteResult,
  CliExecResult,
  HttpFetchResult,
  DirectoryEntry,
  FileListResult,
  FileDeleteResult,
  EnvReadResult,
  ExecuteErrorCode,
} from "./execute.js";
export {
  isExecutePayload,
  isFileWritePayload,
  isCliExecPayload,
  isHttpFetchPayload,
  isFileDeletePayload,
  isEnvReadPayload,
  isExecuteResponse,
  isExecuteResult,
  isFileReadResult,
  isFileWriteResult,
  isCliExecResult,
  isHttpFetchResult,
  isFileListResult,
  isFileDeleteResult,
  isEnvReadResult,
} from "./execute.js";
