/**
 * Post-execution verification module.
 *
 * This module provides verification capability to compare actual operations
 * against what was authorized via a mandate, detecting unauthorized deviations.
 *
 * @example
 * ```typescript
 * import { Verifier } from '@predicatesystems/authority';
 *
 * const verifier = new Verifier({ baseUrl: 'http://127.0.0.1:8787' });
 *
 * // After executing an authorized operation
 * const result = await verifier.verify({
 *   mandateId: decision.mandate_id,
 *   actual: {
 *     action: 'fs.read',
 *     resource: '/src/index.ts',
 *   },
 * });
 *
 * if (!result.verified) {
 *   console.error('Operation mismatch:', result.reason, result.details);
 * }
 * ```
 *
 * @module verify
 */

// Evidence types (discriminated union)
export type {
  EvidenceType,
  ExecutionEvidence,
  FileEvidence,
  CliEvidence,
  BrowserEvidence,
  HttpEvidence,
  DbEvidence,
  GenericEvidence,
} from "./types.js";

// Core types
export type {
  ActualOperation,
  AuthorizedOperation,
  MandateDetails,
  RecordVerificationRequest,
  RecordVerificationResponse,
  VerificationFailureReason,
  VerifyRequest,
  VerifyResult,
} from "./types.js";

// Type guards and helpers
export {
  getEvidenceType,
  isMandateDetails,
  isRecordVerificationResponse,
  isFileEvidence,
  isCliEvidence,
  isBrowserEvidence,
  isHttpEvidence,
  isDbEvidence,
} from "./types.js";

// Comparators
export {
  actionsMatch,
  normalizeResource,
  resourcesMatch,
  type ResourceMatchOptions,
} from "./comparators.js";

// Verifier
export { Verifier, type MandateProvider, type VerifierOptions } from "./verifier.js";
