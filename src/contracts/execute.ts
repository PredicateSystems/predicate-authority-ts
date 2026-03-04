/**
 * Execute types for Phase 5: Execution Proxying (Zero-Trust).
 *
 * These types support the `/v1/execute` endpoint which allows the sidecar to
 * execute operations on behalf of agents, preventing resource-swapping attacks.
 */

// --- Request Types ---

/**
 * Payload for fs.write operations
 */
export interface FileWritePayload {
  type: "file_write";
  content: string;
  create?: boolean;
  append?: boolean;
}

/**
 * Payload for cli.exec operations
 */
export interface CliExecPayload {
  type: "cli_exec";
  command: string;
  args?: string[];
  cwd?: string;
  timeout_ms?: number;
}

/**
 * Payload for http.fetch operations
 */
export interface HttpFetchPayload {
  type: "http_fetch";
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

/**
 * Payload for fs.delete operations
 */
export interface FileDeletePayload {
  type: "file_delete";
  recursive?: boolean;
}

/**
 * Payload for env.read operations
 */
export interface EnvReadPayload {
  type: "env_read";
  keys: string[];
}

/**
 * Union type for all execute payloads
 */
export type ExecutePayload =
  | FileWritePayload
  | CliExecPayload
  | HttpFetchPayload
  | FileDeletePayload
  | EnvReadPayload;

/**
 * POST /v1/execute request body
 */
export interface ExecuteRequest {
  /** Mandate ID from prior authorization */
  mandate_id: string;
  /** Action to execute (must match mandate) */
  action: string;
  /** Resource to operate on (must match mandate's resource scope) */
  resource: string;
  /** Action-specific payload */
  payload?: ExecutePayload;
}

// --- Result Types ---

/**
 * Result of fs.read operation
 */
export interface FileReadResult {
  type: "file_read";
  content: string;
  size: number;
  content_hash: string;
}

/**
 * Result of fs.write operation
 */
export interface FileWriteResult {
  type: "file_write";
  bytes_written: number;
  content_hash: string;
}

/**
 * Result of cli.exec operation
 */
export interface CliExecResult {
  type: "cli_exec";
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
}

/**
 * Result of http.fetch operation
 */
export interface HttpFetchResult {
  type: "http_fetch";
  status_code: number;
  headers: Record<string, string>;
  body: string;
  body_hash: string;
}

/**
 * Directory entry for fs.list result
 */
export interface DirectoryEntry {
  name: string;
  type: "file" | "dir" | "symlink";
  size: number;
  modified?: number;
}

/**
 * Result of fs.list operation
 */
export interface FileListResult {
  type: "file_list";
  entries: DirectoryEntry[];
  total_entries: number;
}

/**
 * Result of fs.delete operation
 */
export interface FileDeleteResult {
  type: "file_delete";
  paths_removed: number;
}

/**
 * Result of env.read operation
 */
export interface EnvReadResult {
  type: "env_read";
  values: Record<string, string>;
}

/**
 * Union type for all execute results
 */
export type ExecuteResult =
  | FileReadResult
  | FileWriteResult
  | CliExecResult
  | HttpFetchResult
  | FileListResult
  | FileDeleteResult
  | EnvReadResult;

// --- Response Types ---

/**
 * POST /v1/execute response body
 */
export interface ExecuteResponse {
  /** Whether execution succeeded */
  success: boolean;
  /** Execution result (action-specific) */
  result?: ExecuteResult;
  /** Error message if failed */
  error?: string;
  /** Audit trail ID */
  audit_id: string;
  /** Evidence hash (for verification) */
  evidence_hash?: string;
}

// --- Error Types ---

/**
 * Execution error codes returned by the sidecar
 */
export type ExecuteErrorCode =
  | "mandate_not_found"
  | "mandate_expired"
  | "action_mismatch"
  | "resource_mismatch"
  | "execution_failed"
  | "unsupported_action"
  | "invalid_payload";

// --- Type Guards ---

export function isFileWritePayload(value: unknown): value is FileWritePayload {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return obj.type === "file_write" && typeof obj.content === "string";
}

export function isCliExecPayload(value: unknown): value is CliExecPayload {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return obj.type === "cli_exec" && typeof obj.command === "string";
}

export function isHttpFetchPayload(value: unknown): value is HttpFetchPayload {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return obj.type === "http_fetch" && typeof obj.method === "string";
}

export function isFileDeletePayload(value: unknown): value is FileDeletePayload {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return obj.type === "file_delete";
}

export function isEnvReadPayload(value: unknown): value is EnvReadPayload {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return obj.type === "env_read" && Array.isArray(obj.keys);
}

export function isExecutePayload(value: unknown): value is ExecutePayload {
  return (
    isFileWritePayload(value) ||
    isCliExecPayload(value) ||
    isHttpFetchPayload(value) ||
    isFileDeletePayload(value) ||
    isEnvReadPayload(value)
  );
}

export function isFileReadResult(value: unknown): value is FileReadResult {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.type === "file_read" &&
    typeof obj.content === "string" &&
    typeof obj.size === "number" &&
    typeof obj.content_hash === "string"
  );
}

export function isFileWriteResult(value: unknown): value is FileWriteResult {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.type === "file_write" &&
    typeof obj.bytes_written === "number" &&
    typeof obj.content_hash === "string"
  );
}

export function isCliExecResult(value: unknown): value is CliExecResult {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.type === "cli_exec" &&
    typeof obj.exit_code === "number" &&
    typeof obj.stdout === "string" &&
    typeof obj.stderr === "string" &&
    typeof obj.duration_ms === "number"
  );
}

export function isHttpFetchResult(value: unknown): value is HttpFetchResult {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.type === "http_fetch" &&
    typeof obj.status_code === "number" &&
    typeof obj.headers === "object" &&
    typeof obj.body === "string" &&
    typeof obj.body_hash === "string"
  );
}

export function isFileListResult(value: unknown): value is FileListResult {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.type === "file_list" &&
    Array.isArray(obj.entries) &&
    typeof obj.total_entries === "number"
  );
}

export function isFileDeleteResult(value: unknown): value is FileDeleteResult {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return obj.type === "file_delete" && typeof obj.paths_removed === "number";
}

export function isEnvReadResult(value: unknown): value is EnvReadResult {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return obj.type === "env_read" && typeof obj.values === "object";
}

export function isExecuteResult(value: unknown): value is ExecuteResult {
  return (
    isFileReadResult(value) ||
    isFileWriteResult(value) ||
    isCliExecResult(value) ||
    isHttpFetchResult(value) ||
    isFileListResult(value) ||
    isFileDeleteResult(value) ||
    isEnvReadResult(value)
  );
}

export function isExecuteResponse(value: unknown): value is ExecuteResponse {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.success === "boolean" && typeof obj.audit_id === "string";
}
