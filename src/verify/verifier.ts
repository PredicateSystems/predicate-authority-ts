/**
 * Post-execution verification module.
 *
 * The Verifier class compares actual operations against what was
 * authorized via a mandate, detecting unauthorized deviations.
 */

import { AuthorityClientError } from "../errors.js";
import { actionsMatch, resourcesMatch } from "./comparators.js";
import {
  type ActualOperation,
  type ExecutionEvidence,
  type GenericEvidence,
  type MandateDetails,
  type RecordVerificationRequest,
  type VerifyRequest,
  type VerifyResult,
  isBrowserEvidence,
  isCliEvidence,
  isDbEvidence,
  isFileEvidence,
  isHttpEvidence,
  isMandateDetails,
  isRecordVerificationResponse,
} from "./types.js";

/**
 * Interface for mandate retrieval.
 *
 * Can be implemented by AuthorityClient or a custom provider.
 */
export interface MandateProvider {
  /**
   * Retrieve mandate details by ID.
   * @param mandateId - The mandate ID to look up
   * @returns Mandate details or null if not found
   */
  getMandate(mandateId: string): Promise<MandateDetails | null>;

  /**
   * Record a verification result in the audit log.
   * @param request - Verification details to record
   * @returns Audit trail ID
   */
  recordVerification(request: RecordVerificationRequest): Promise<string>;
}

/**
 * Options for creating a Verifier.
 */
export interface VerifierOptions {
  /** Base URL of the sidecar */
  baseUrl: string;

  /** Request timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * Verifier for post-execution authorization checks.
 *
 * Compares actual operations against mandates to detect unauthorized
 * deviations from what was authorized.
 *
 * @example
 * ```typescript
 * const verifier = new Verifier({ baseUrl: 'http://127.0.0.1:8787' });
 *
 * const result = await verifier.verify({
 *   mandateId: decision.mandate_id,
 *   actual: {
 *     action: 'fs.read',
 *     resource: '/src/index.ts',
 *   },
 * });
 *
 * if (!result.verified) {
 *   console.error('Operation mismatch:', result.reason);
 * }
 * ```
 */
export class Verifier implements MandateProvider {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: VerifierOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 2000;
  }

  /**
   * Verify that an actual operation matches its mandate.
   *
   * @param request - Verification request with mandate ID and actual operation
   * @returns Verification result
   */
  async verify(request: VerifyRequest): Promise<VerifyResult> {
    // 1. Retrieve mandate details
    const mandate = await this.getMandate(request.mandateId);

    if (!mandate) {
      return {
        verified: false,
        reason: "mandate_not_found",
      };
    }

    // 2. Check mandate expiration
    const expiresAt = new Date(mandate.expires_at).getTime();
    if (expiresAt < Date.now()) {
      return {
        verified: false,
        reason: "mandate_expired",
      };
    }

    // 3. Compare action
    if (!actionsMatch(mandate.action, request.actual.action)) {
      const result: VerifyResult = {
        verified: false,
        reason: "action_mismatch",
        details: {
          authorized: { action: mandate.action, resource: mandate.resource },
          actual: {
            action: request.actual.action,
            resource: request.actual.resource,
          },
        },
      };

      // Record failed verification
      await this.recordVerification({
        mandateId: request.mandateId,
        verified: false,
        actual: request.actual,
        reason: "action_mismatch",
      });

      return result;
    }

    // 4. Compare resource (with normalization)
    if (!resourcesMatch(mandate.resource, request.actual.resource)) {
      const result: VerifyResult = {
        verified: false,
        reason: "resource_mismatch",
        details: {
          authorized: { action: mandate.action, resource: mandate.resource },
          actual: {
            action: request.actual.action,
            resource: request.actual.resource,
          },
        },
      };

      // Record failed verification
      await this.recordVerification({
        mandateId: request.mandateId,
        verified: false,
        actual: request.actual,
        reason: "resource_mismatch",
      });

      return result;
    }

    // 5. Record successful verification
    const auditId = await this.recordVerification({
      mandateId: request.mandateId,
      verified: true,
      actual: request.actual,
    });

    return {
      verified: true,
      auditId,
    };
  }

  /**
   * Verify an operation locally without sidecar communication.
   *
   * Use this when the sidecar endpoints are not available yet (Phase 2).
   * This performs the same matching logic but skips mandate retrieval
   * and audit logging.
   *
   * @param mandate - Known mandate details
   * @param request - Verification request
   * @returns Verification result (without auditId)
   */
  verifyLocal(mandate: MandateDetails, request: VerifyRequest): VerifyResult {
    // Check mandate expiration
    const expiresAt = new Date(mandate.expires_at).getTime();
    if (expiresAt < Date.now()) {
      return {
        verified: false,
        reason: "mandate_expired",
      };
    }

    // Compare action
    if (!actionsMatch(mandate.action, request.actual.action)) {
      return {
        verified: false,
        reason: "action_mismatch",
        details: {
          authorized: { action: mandate.action, resource: mandate.resource },
          actual: {
            action: request.actual.action,
            resource: request.actual.resource,
          },
        },
      };
    }

    // Compare resource
    if (!resourcesMatch(mandate.resource, request.actual.resource)) {
      return {
        verified: false,
        reason: "resource_mismatch",
        details: {
          authorized: { action: mandate.action, resource: mandate.resource },
          actual: {
            action: request.actual.action,
            resource: request.actual.resource,
          },
        },
      };
    }

    return { verified: true };
  }

  /**
   * Retrieve mandate details from the sidecar.
   *
   * @param mandateId - Mandate ID to look up
   * @returns Mandate details or null if not found
   */
  async getMandate(mandateId: string): Promise<MandateDetails | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/v1/mandates/${encodeURIComponent(mandateId)}`, {
        method: "GET",
        headers: {
          accept: "application/json",
        },
        signal: controller.signal,
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new AuthorityClientError(`mandate lookup failed: ${response.status}`, {
          code: "server_error",
          status: response.status,
        });
      }

      const payload = await response.json();

      if (!isMandateDetails(payload)) {
        throw new AuthorityClientError("invalid mandate response payload", {
          code: "protocol_error",
          status: response.status,
          details: payload,
        });
      }

      return payload;
    } catch (error) {
      if (error instanceof AuthorityClientError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new AuthorityClientError("mandate lookup timed out", {
          code: "timeout",
          cause: error,
        });
      }
      throw new AuthorityClientError("mandate lookup failed", {
        code: "network_error",
        cause: error,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Record a verification result in the sidecar's audit log.
   *
   * @param request - Verification details to record
   * @returns Audit trail ID
   */
  async recordVerification(request: RecordVerificationRequest): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const actualPayload = this.buildActualPayload(request.actual);

      const response = await fetch(`${this.baseUrl}/v1/verify`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          mandate_id: request.mandateId,
          verified: request.verified,
          actual: actualPayload,
          reason: request.reason,
          verified_at: new Date().toISOString(),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new AuthorityClientError(`record verification failed: ${response.status}`, {
          code: "server_error",
          status: response.status,
        });
      }

      const payload = await response.json();

      if (!isRecordVerificationResponse(payload)) {
        // Graceful fallback: generate a local audit ID if sidecar doesn't return one
        return `local_audit_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      }

      return payload.audit_id;
    } catch (error) {
      if (error instanceof AuthorityClientError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new AuthorityClientError("record verification timed out", {
          code: "timeout",
          cause: error,
        });
      }
      throw new AuthorityClientError("record verification failed", {
        code: "network_error",
        cause: error,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Build the actual operation payload for the verification request.
   * Handles the discriminated union by extracting type-specific fields.
   */
  private buildActualPayload(
    actual: ExecutionEvidence | ActualOperation,
  ): Record<string, unknown> {
    // Common fields present on all evidence types
    const payload: Record<string, unknown> = {
      action: actual.action,
      resource: actual.resource,
      executed_at: actual.executedAt,
    };

    // Check if it has a type discriminator (new ExecutionEvidence types)
    if ("type" in actual) {
      payload.type = actual.type;

      if (isFileEvidence(actual)) {
        payload.content_hash = actual.contentHash;
        payload.file_size = actual.fileSize;
        payload.permissions = actual.permissions;
        payload.modified_at = actual.modifiedAt;
      } else if (isCliEvidence(actual)) {
        payload.command = actual.command;
        payload.exit_code = actual.exitCode;
        payload.stdout_hash = actual.stdoutHash;
        payload.stderr_hash = actual.stderrHash;
        payload.transcript_hash = actual.transcriptHash;
        payload.cwd = actual.cwd;
        payload.duration_ms = actual.durationMs;
      } else if (isBrowserEvidence(actual)) {
        payload.final_url = actual.finalUrl;
        payload.selector = actual.selector;
        payload.a11y_tree_hash = actual.a11yTreeHash;
        payload.dom_state_hash = actual.domStateHash;
        payload.screenshot_hash = actual.screenshotHash;
        payload.page_title = actual.pageTitle;
      } else if (isHttpEvidence(actual)) {
        payload.method = actual.method;
        payload.status_code = actual.statusCode;
        payload.response_body_hash = actual.responseBodyHash;
        payload.content_type = actual.contentType;
        payload.response_size = actual.responseSize;
        payload.duration_ms = actual.durationMs;
      } else if (isDbEvidence(actual)) {
        payload.query_hash = actual.queryHash;
        payload.rows_affected = actual.rowsAffected;
        payload.result_hash = actual.resultHash;
        payload.duration_ms = actual.durationMs;
      } else {
        // GenericEvidence
        const generic = actual as GenericEvidence;
        payload.evidence_hash = generic.evidenceHash;
        payload.metadata = generic.metadata;
      }
    } else {
      // Legacy ActualOperation - extract known fields
      const legacy = actual as ActualOperation;
      payload.content_hash = legacy.contentHash;
      payload.transcript_hash = legacy.transcriptHash;
    }

    return payload;
  }
}
