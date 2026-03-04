import { AuthorityClientError } from "./errors.js";
import {
  type AuthorizationResponse,
  type AuthorizeRequest,
  type ExecutePayload,
  type ExecuteRequest,
  type ExecuteResponse,
  isAuthorizationResponse,
  isExecuteResponse,
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
  // Execute types for Phase 5: Execution Proxying (Zero-Trust)
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
  // Execute type guards
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

// Post-execution verification module
export {
  // Evidence types (discriminated union)
  type EvidenceType,
  type ExecutionEvidence,
  type FileEvidence,
  type CliEvidence,
  type BrowserEvidence,
  type HttpEvidence,
  type DbEvidence,
  type GenericEvidence,
  // Core types
  type ActualOperation,
  type AuthorizedOperation,
  type MandateDetails,
  type RecordVerificationRequest,
  type RecordVerificationResponse,
  type VerificationFailureReason,
  type VerifyRequest,
  type VerifyResult,
  type ResourceMatchOptions,
  type MandateProvider,
  type VerifierOptions,
  // Type guards and helpers
  getEvidenceType,
  isMandateDetails,
  isRecordVerificationResponse,
  isFileEvidence,
  isCliEvidence,
  isBrowserEvidence,
  isHttpEvidence,
  isDbEvidence,
  // Comparators
  actionsMatch,
  normalizeResource,
  resourcesMatch,
  // Verifier class
  Verifier,
} from "./verify/index.js";

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
  executeEndpointPath?: "/v1/execute" | "/execute";
}

/**
 * Options for authorizeAndExecute convenience method
 */
export interface AuthorizeAndExecuteOptions {
  /** Principal making the request */
  principal: string;
  /** Action to perform */
  action: string;
  /** Resource to operate on */
  resource: string;
  /** Intent hash for mandate */
  intentHash?: string;
  /** Labels for authorization */
  labels?: string[];
  /** Optional payload for the execution */
  payload?: ExecutePayload;
}

export class AuthorityClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly backoffInitialMs: number;
  private readonly endpointPath: "/v1/authorize" | "/authorize";
  private readonly executeEndpointPath: "/v1/execute" | "/execute";

  constructor(options: AuthorityClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 2000;
    this.maxRetries = options.maxRetries ?? 0;
    this.backoffInitialMs = options.backoffInitialMs ?? 200;
    this.endpointPath = options.endpointPath ?? "/v1/authorize";
    this.executeEndpointPath = options.executeEndpointPath ?? "/v1/execute";
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

  /**
   * Execute an operation through the sidecar (Phase 5: Execution Proxying).
   *
   * The sidecar validates the mandate and executes the operation on behalf of the agent,
   * preventing "confused deputy" attacks where an agent could request authorization for
   * one resource but access another.
   *
   * @param request - Execute request with mandate_id from prior authorization
   * @returns Execute response with success status and action-specific result
   */
  async execute(request: ExecuteRequest): Promise<ExecuteResponse> {
    const attempts = this.maxRetries + 1;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        let response: Response;
        try {
          response = await fetch(`${this.baseUrl}${this.executeEndpointPath}`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify(request),
            signal: controller.signal,
          });
        } catch (error) {
          if (attempt < this.maxRetries) {
            await sleep(this.backoffInitialMs * (attempt + 1));
            continue;
          }
          if (error instanceof Error && error.name === "AbortError") {
            throw new AuthorityClientError("execute request timed out", {
              code: "timeout",
              cause: error,
            });
          }
          throw new AuthorityClientError("execute request failed before response", {
            code: "network_error",
            cause: error,
          });
        }

        const payload = await parseJsonSafely(response);

        if (!response.ok) {
          if (response.status >= 500 && attempt < this.maxRetries) {
            await sleep(this.backoffInitialMs * (attempt + 1));
            continue;
          }
          // For execute, we may get a 4xx with a valid ExecuteResponse containing error info
          if (isExecuteResponse(payload)) {
            return payload;
          }
          throw mapHttpError(response.status, payload);
        }

        if (!isExecuteResponse(payload)) {
          throw new AuthorityClientError("invalid execute response payload", {
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

    throw new AuthorityClientError("execute request exhausted retry budget", {
      code: "network_error",
    });
  }

  /**
   * Convenience method that combines authorize + execute in a single call.
   *
   * This is the recommended pattern for zero-trust execution:
   * 1. Authorize the action and obtain a mandate
   * 2. Execute the operation through the sidecar using the mandate
   *
   * @param options - Authorization and execution options
   * @returns Execute response with success status and action-specific result
   * @throws AuthorityClientError if authorization is denied or execution fails
   */
  async authorizeAndExecute(options: AuthorizeAndExecuteOptions): Promise<ExecuteResponse> {
    const { principal, action, resource, intentHash, labels, payload } = options;

    // Step 1: Authorize and get mandate
    const authResponse = await this.authorize({
      principal,
      action,
      resource,
      intent_hash: intentHash ?? `${action}:${resource}`,
      labels: labels ?? [],
    });

    if (!authResponse.allowed) {
      throw new AuthorityClientError(
        `authorization denied: ${authResponse.reason}`,
        {
          code: "forbidden",
          details: {
            reason: authResponse.reason,
            missing_labels: authResponse.missing_labels,
          },
        }
      );
    }

    if (!authResponse.mandate_id) {
      throw new AuthorityClientError(
        "authorization succeeded but no mandate_id returned",
        {
          code: "protocol_error",
          details: authResponse,
        }
      );
    }

    // Step 2: Execute through sidecar
    return this.execute({
      mandate_id: authResponse.mandate_id,
      action,
      resource,
      payload,
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
