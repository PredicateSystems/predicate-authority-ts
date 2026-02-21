import { AuthorityClientError } from "./errors.js";
import {
  type AuthorizationResponse,
  type AuthorizeRequest,
  isAuthorizationResponse,
  toSidecarAuthorizeRequest,
} from "./types.js";

export type {
  ActionRequest,
  ActionSpec,
  AuthorizationDecision,
  AuthorizationRequest,
  AuthorizationReason,
  AuthorizeRequest,
  AuthorizationResponse,
  MandateClaims,
  PolicyEffect,
  PolicyRule,
  PrincipalRef,
  ProofEvent,
  SidecarAuthorizeRequest,
  SignedMandate,
  StateEvidence,
  VerificationEvidence,
  VerificationSignal,
  VerificationStatus,
} from "./types.js";
export { AuthorityClientError, type AuthorityClientErrorCode } from "./errors.js";
export {
  AUTHORIZATION_REASONS,
  POLICY_EFFECTS,
  VERIFICATION_STATUSES,
  isAuthorizationDecision,
  isMandateClaims,
  isLabelPassed,
  isPolicyRule,
  isProofEvent,
  passedLabels,
  isSignedMandate,
  toSidecarAuthorizeRequest,
} from "./types.js";
export { effectiveMaxDelegationDepth, globMatch, matchesRule } from "./policy/matching.js";
export { PolicyEngine, type PolicyMatchResult } from "./policy/engine.js";
export {
  ActionGuard,
  AuthorizationDeniedError,
  type ActionExecutionResult,
  type ActionGuardOptions,
} from "./guard/action-guard.js";
export {
  guardedFileRead,
  guardedFileWrite,
  guardedHttp,
  guardedShell,
  type GuardedFileReadOptions,
  type GuardedFileWriteOptions,
  type GuardedHttpOptions,
  type GuardedShellOptions,
} from "./wrappers/sensitive-operations.js";
export {
  buildWebStateEvidenceFromRuntimeSnapshot,
  buildWebStateEvidence,
  type RuntimeSnapshotLike,
  type WebStateEvidenceOptions,
  type WebStateSnapshot,
  webStateSnapshotFromRuntimeSnapshot,
} from "./evidence/web-state.js";
export {
  buildDesktopAccessibilityStateEvidence,
  buildTerminalStateEvidence,
  collectVerificationEvidence,
  type DesktopAccessibilityEvidenceProvider,
  type DesktopAccessibilitySnapshot,
  type DesktopStateEvidenceOptions,
  type EvidenceHasher,
  type TerminalEvidenceProvider,
  type TerminalSessionSnapshot,
  type TerminalStateEvidenceOptions,
  type VerificationSignalProvider,
} from "./evidence/non-web.js";

// Canonicalization module for reproducible state hashes
export {
  // Types
  type Platform,
  type TerminalSessionSnapshot as CanonicalTerminalInput,
  type CanonicalTerminalSnapshot,
  type AccessibilityNode,
  type DesktopAccessibilitySnapshot as CanonicalDesktopInput,
  type CanonicalAccessibilityNode,
  type CanonicalDesktopSnapshot,
  // Utility functions
  normalizeText,
  normalizeCommand,
  stripAnsi,
  normalizeTimestamps,
  normalizeTranscript,
  normalizePath,
  isSecretKey,
  hashEnvironment,
  sha256,
  // Terminal canonicalization
  canonicalizeTerminalSnapshot,
  computeTerminalStateHash,
  TERMINAL_SCHEMA_VERSION,
  // Desktop canonicalization
  canonicalizeAccessibilityNode,
  buildFocusedPath,
  canonicalizeDesktopSnapshot,
  computeDesktopStateHash,
  DESKTOP_SCHEMA_VERSION,
} from "./canonicalization/index.js";

export interface AuthorityClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  maxRetries?: number;
  backoffInitialMs?: number;
  endpointPath?: "/v1/authorize" | "/authorize";
}

export class AuthorityClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly backoffInitialMs: number;
  private readonly endpointPath: "/v1/authorize" | "/authorize";

  constructor(options: AuthorityClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 2000;
    this.maxRetries = options.maxRetries ?? 0;
    this.backoffInitialMs = options.backoffInitialMs ?? 200;
    this.endpointPath = options.endpointPath ?? "/v1/authorize";
  }

  async authorize(request: AuthorizeRequest): Promise<AuthorizationResponse> {
    const wireRequest = toSidecarAuthorizeRequest(request);
    const attempts = this.maxRetries + 1;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        let response: Response;
        try {
          response = await fetch(`${this.baseUrl}${this.endpointPath}`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify(wireRequest),
            signal: controller.signal,
          });
        } catch (error) {
          if (attempt < this.maxRetries) {
            await sleep(this.backoffInitialMs * (attempt + 1));
            continue;
          }
          if (error instanceof Error && error.name === "AbortError") {
            throw new AuthorityClientError("authorize request timed out", {
              code: "timeout",
              cause: error,
            });
          }
          throw new AuthorityClientError("authorize request failed before response", {
            code: "network_error",
            cause: error,
          });
        }

        const payload = await parseJsonSafely(response);

        // Sidecar deny decisions intentionally return HTTP 403 with decision body.
        if (response.status === 403 && isAuthorizationResponse(payload)) {
          return payload;
        }

        if (!response.ok) {
          if (response.status >= 500 && attempt < this.maxRetries) {
            await sleep(this.backoffInitialMs * (attempt + 1));
            continue;
          }
          throw mapHttpError(response.status, payload);
        }

        if (!isAuthorizationResponse(payload)) {
          throw new AuthorityClientError("invalid authorize response payload", {
            code: "protocol_error",
            status: response.status,
            details: payload,
          });
        }

        return payload;
      } finally {
        clearTimeout(timer);
      }
    }

    throw new AuthorityClientError("authorize request exhausted retry budget", {
      code: "network_error",
    });
  }
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === "") {
    return {};
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new AuthorityClientError("non-JSON response from authority sidecar", {
      code: "protocol_error",
      status: response.status,
      details: text,
      cause: error,
    });
  }
}

function mapHttpError(status: number, payload: unknown): AuthorityClientError {
  const message = extractErrorMessage(payload) ?? `authorize_failed_${status}`;
  if (status === 400) {
    return new AuthorityClientError(message, { code: "bad_request", status, details: payload });
  }
  if (status === 401) {
    return new AuthorityClientError(message, { code: "unauthorized", status, details: payload });
  }
  if (status === 403) {
    return new AuthorityClientError(message, { code: "forbidden", status, details: payload });
  }
  if (status >= 500) {
    return new AuthorityClientError(message, { code: "server_error", status, details: payload });
  }
  return new AuthorityClientError(message, { code: "protocol_error", status, details: payload });
}

function extractErrorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const obj = payload as Record<string, unknown>;
  if (typeof obj.error === "string" && obj.error.trim() !== "") {
    return obj.error;
  }
  if (typeof obj.detail === "string" && obj.detail.trim() !== "") {
    return obj.detail;
  }
  return null;
}
