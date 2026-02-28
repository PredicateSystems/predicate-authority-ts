/**
 * Types for post-execution verification.
 *
 * These types support verifying that actual operations match
 * what was authorized via a mandate.
 *
 * The verification system uses discriminated unions to support different
 * evidence schemas based on the action domain:
 *
 * - `file`: File system operations with content hashes
 * - `cli`: Terminal/shell operations with transcript evidence
 * - `browser`: Web operations with DOM/A11y state
 * - `http`: HTTP requests with response evidence
 * - `db`: Database operations with query evidence
 */

// =============================================================================
// Discriminated Union Evidence Types
// =============================================================================

/**
 * Evidence type discriminator.
 */
export type EvidenceType = "file" | "cli" | "browser" | "http" | "db" | "generic";

/**
 * Base interface for all evidence types.
 */
interface BaseEvidence {
  /** Discriminator field for type narrowing */
  type: EvidenceType;

  /** The action that was actually performed (e.g., "fs.read", "cli.exec") */
  action: string;

  /** The resource that was accessed (path, URL, command, etc.) */
  resource: string;

  /** Timestamp when operation was executed (ISO 8601) */
  executedAt?: string;
}

/**
 * Evidence for file system operations (fs.read, fs.write, etc.)
 */
export interface FileEvidence extends BaseEvidence {
  type: "file";

  /** Hash of file content (SHA-256) */
  contentHash?: string;

  /** File size in bytes */
  fileSize?: number;

  /** File permissions (octal string, e.g., "644") */
  permissions?: string;

  /** Last modified timestamp (ISO 8601) */
  modifiedAt?: string;
}

/**
 * Evidence for terminal/CLI operations (cli.exec, cli.spawn, etc.)
 */
export interface CliEvidence extends BaseEvidence {
  type: "cli";

  /** The exact command that was executed */
  command?: string;

  /** Exit code of the process */
  exitCode?: number;

  /** Hash of stdout transcript */
  stdoutHash?: string;

  /** Hash of stderr transcript */
  stderrHash?: string;

  /** Combined transcript hash (stdout + stderr) */
  transcriptHash?: string;

  /** Working directory where command was executed */
  cwd?: string;

  /** Duration in milliseconds */
  durationMs?: number;
}

/**
 * Evidence for browser/web operations (browser.click, browser.navigate, etc.)
 */
export interface BrowserEvidence extends BaseEvidence {
  type: "browser";

  /** Final URL after navigation */
  finalUrl?: string;

  /** DOM selector that was interacted with */
  selector?: string;

  /** Hash of accessibility tree state */
  a11yTreeHash?: string;

  /** Hash of visible DOM state */
  domStateHash?: string;

  /** Screenshot hash (if captured) */
  screenshotHash?: string;

  /** Page title after operation */
  pageTitle?: string;
}

/**
 * Evidence for HTTP operations (http.get, http.post, etc.)
 */
export interface HttpEvidence extends BaseEvidence {
  type: "http";

  /** HTTP method used */
  method?: string;

  /** Response status code */
  statusCode?: number;

  /** Hash of response body */
  responseBodyHash?: string;

  /** Response content type */
  contentType?: string;

  /** Response size in bytes */
  responseSize?: number;

  /** Request duration in milliseconds */
  durationMs?: number;
}

/**
 * Evidence for database operations (db.query, db.insert, etc.)
 */
export interface DbEvidence extends BaseEvidence {
  type: "db";

  /** Hash of query/statement */
  queryHash?: string;

  /** Number of rows affected */
  rowsAffected?: number;

  /** Hash of result set (for queries) */
  resultHash?: string;

  /** Query duration in milliseconds */
  durationMs?: number;
}

/**
 * Generic evidence for unknown or custom action types.
 */
export interface GenericEvidence extends BaseEvidence {
  type: "generic";

  /** Arbitrary evidence hash */
  evidenceHash?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Discriminated union of all evidence types.
 *
 * Use the `type` field to narrow to a specific evidence type:
 *
 * @example
 * ```typescript
 * function processEvidence(evidence: ExecutionEvidence) {
 *   switch (evidence.type) {
 *     case "file":
 *       console.log("File hash:", evidence.contentHash);
 *       break;
 *     case "cli":
 *       console.log("Exit code:", evidence.exitCode);
 *       break;
 *     case "browser":
 *       console.log("Final URL:", evidence.finalUrl);
 *       break;
 *   }
 * }
 * ```
 */
export type ExecutionEvidence =
  | FileEvidence
  | CliEvidence
  | BrowserEvidence
  | HttpEvidence
  | DbEvidence
  | GenericEvidence;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract the domain from an action string.
 *
 * @example
 * getActionDomain("fs.read") // => "file"
 * getActionDomain("cli.exec") // => "cli"
 * getActionDomain("browser.click") // => "browser"
 * getActionDomain("custom.action") // => "generic"
 */
export function getEvidenceType(action: string): EvidenceType {
  const prefix = action.split(".")[0];
  const domainMap: Record<string, EvidenceType> = {
    fs: "file",
    file: "file",
    cli: "cli",
    shell: "cli",
    terminal: "cli",
    browser: "browser",
    web: "browser",
    http: "http",
    https: "http",
    db: "db",
    database: "db",
    sql: "db",
  };
  return domainMap[prefix] ?? "generic";
}

/**
 * Type guard for FileEvidence.
 */
export function isFileEvidence(evidence: ExecutionEvidence): evidence is FileEvidence {
  return evidence.type === "file";
}

/**
 * Type guard for CliEvidence.
 */
export function isCliEvidence(evidence: ExecutionEvidence): evidence is CliEvidence {
  return evidence.type === "cli";
}

/**
 * Type guard for BrowserEvidence.
 */
export function isBrowserEvidence(evidence: ExecutionEvidence): evidence is BrowserEvidence {
  return evidence.type === "browser";
}

/**
 * Type guard for HttpEvidence.
 */
export function isHttpEvidence(evidence: ExecutionEvidence): evidence is HttpEvidence {
  return evidence.type === "http";
}

/**
 * Type guard for DbEvidence.
 */
export function isDbEvidence(evidence: ExecutionEvidence): evidence is DbEvidence {
  return evidence.type === "db";
}

// =============================================================================
// Core Verification Types
// =============================================================================

/**
 * Reason codes for verification failure.
 */
export type VerificationFailureReason =
  | "resource_mismatch"
  | "action_mismatch"
  | "mandate_expired"
  | "mandate_not_found"
  | "evidence_mismatch";

/**
 * Details about an authorized operation from a mandate.
 */
export interface AuthorizedOperation {
  action: string;
  resource: string;
}

/**
 * Legacy ActualOperation interface for backward compatibility.
 *
 * @deprecated Use ExecutionEvidence discriminated union instead.
 */
export interface ActualOperation {
  /** The action that was actually performed */
  action: string;

  /** The resource that was actually accessed */
  resource: string;

  /** Timestamp when operation was executed (ISO 8601) */
  executedAt?: string;

  /** @deprecated Use FileEvidence.contentHash instead */
  contentHash?: string;

  /** @deprecated Use CliEvidence.transcriptHash instead */
  transcriptHash?: string;
}

/**
 * Request to verify an operation against its mandate.
 *
 * Supports both the legacy ActualOperation format and the new
 * discriminated union ExecutionEvidence format.
 */
export interface VerifyRequest {
  /** Mandate ID from the authorization decision */
  mandateId: string;

  /**
   * The actual operation that was performed.
   *
   * Can be either:
   * - ExecutionEvidence (discriminated union with `type` field) - recommended
   * - ActualOperation (legacy format without `type` field) - deprecated
   */
  actual: ExecutionEvidence | ActualOperation;
}

/**
 * Result of verification.
 */
export interface VerifyResult {
  /** Whether the operation matched the authorization */
  verified: boolean;

  /** Reason for verification failure (if verified is false) */
  reason?: VerificationFailureReason;

  /** Details about the mismatch (if verification failed) */
  details?: {
    authorized: AuthorizedOperation;
    actual: ExecutionEvidence | ActualOperation;
  };

  /** Audit trail ID from the sidecar (if verification succeeded) */
  auditId?: string;
}

// =============================================================================
// Mandate Types
// =============================================================================

/**
 * Mandate details retrieved from the sidecar.
 */
export interface MandateDetails {
  /** Unique mandate identifier */
  mandate_id: string;

  /** Principal that was granted authorization */
  principal: string;

  /** Action that was authorized */
  action: string;

  /** Resource that was authorized */
  resource: string;

  /** Hash of the stated intent */
  intent_hash: string;

  /** When the mandate was issued (ISO 8601) */
  issued_at: string;

  /** When the mandate expires (ISO 8601) */
  expires_at: string;
}

/**
 * Type guard for MandateDetails.
 */
export function isMandateDetails(value: unknown): value is MandateDetails {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.mandate_id === "string" &&
    typeof obj.principal === "string" &&
    typeof obj.action === "string" &&
    typeof obj.resource === "string" &&
    typeof obj.intent_hash === "string" &&
    typeof obj.issued_at === "string" &&
    typeof obj.expires_at === "string"
  );
}

// =============================================================================
// Audit Types
// =============================================================================

/**
 * Request to record a verification in the audit log.
 */
export interface RecordVerificationRequest {
  /** Mandate ID that was verified */
  mandateId: string;

  /** Whether verification succeeded */
  verified: boolean;

  /** The actual operation details */
  actual: ExecutionEvidence | ActualOperation;

  /** Reason for failure (if verified is false) */
  reason?: VerificationFailureReason;
}

/**
 * Response from recording a verification.
 */
export interface RecordVerificationResponse {
  /** Audit trail ID */
  audit_id: string;
}

/**
 * Type guard for RecordVerificationResponse.
 */
export function isRecordVerificationResponse(
  value: unknown,
): value is RecordVerificationResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj.audit_id === "string";
}
