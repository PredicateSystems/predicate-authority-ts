import type { VerificationStatus } from "./enums.js";

export interface PrincipalRef {
  principal_id: string;
  tenant_id?: string;
  session_id?: string;
}

export interface ActionSpec {
  action: string;
  resource: string;
  intent: string;
}

export interface StateEvidence {
  source: string;
  state_hash: string;
  schema_version?: string;
  confidence?: number;
}

export interface VerificationSignal {
  label: string;
  status: VerificationStatus;
  required?: boolean;
  reason?: string;
}

export interface VerificationEvidence {
  signals?: VerificationSignal[];
}

// Canonical request shape mapped from Python predicate_contracts.ActionRequest.
export interface ActionRequest {
  principal: PrincipalRef;
  action_spec: ActionSpec;
  state_evidence: StateEvidence;
  verification_evidence?: VerificationEvidence;
}

// Sidecar wire-format accepted by /v1/authorize today.
export interface SidecarAuthorizeRequest {
  principal: string;
  action: string;
  resource: string;
  intent_hash?: string;
  context?: Record<string, unknown>;
  labels?: string[];
}

export type AuthorizeRequest = ActionRequest | SidecarAuthorizeRequest;

export function toSidecarAuthorizeRequest(request: AuthorizeRequest): SidecarAuthorizeRequest {
  if (isSidecarAuthorizeRequest(request)) {
    return request;
  }
  const labels = (request.verification_evidence?.signals ?? [])
    .filter((signal) => signal.status === "passed")
    .map((signal) => signal.label);
  const intentHash = stableIntentHashFromIntent(request.action_spec.intent);
  return {
    principal: request.principal.principal_id,
    action: request.action_spec.action,
    resource: request.action_spec.resource,
    intent_hash: intentHash,
    context: {
      state_source: request.state_evidence.source,
      state_hash: request.state_evidence.state_hash,
      schema_version: request.state_evidence.schema_version ?? "v1",
      confidence: request.state_evidence.confidence,
      tenant_id: request.principal.tenant_id,
      session_id: request.principal.session_id,
    },
    labels,
  };
}

function isSidecarAuthorizeRequest(value: AuthorizeRequest): value is SidecarAuthorizeRequest {
  return typeof (value as SidecarAuthorizeRequest).principal === "string";
}

function stableIntentHashFromIntent(intent: string): string {
  // Phase 0 compatibility placeholder: deterministic, local hash surrogate.
  // Final parity helper will be replaced with python-compatible canonical hash.
  return `ih_${intent.trim().toLowerCase().replace(/\s+/g, "_")}`;
}
