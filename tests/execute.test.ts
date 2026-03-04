import { describe, expect, it } from "vitest";
import {
  type CliExecPayload,
  type CliExecResult,
  type ExecutePayload,
  type ExecuteRequest,
  type ExecuteResponse,
  type FileReadResult,
  type FileWritePayload,
  type FileWriteResult,
  type HttpFetchPayload,
  type HttpFetchResult,
  isCliExecPayload,
  isCliExecResult,
  isExecutePayload,
  isExecuteResponse,
  isExecuteResult,
  isFileReadResult,
  isFileWritePayload,
  isFileWriteResult,
  isHttpFetchPayload,
  isHttpFetchResult,
} from "../src/index.js";

describe("Execute types", () => {
  describe("ExecuteRequest", () => {
    it("accepts valid request without payload", () => {
      const request: ExecuteRequest = {
        mandate_id: "m_abc123",
        action: "fs.read",
        resource: "/src/index.ts",
      };
      expect(request.mandate_id).toBe("m_abc123");
      expect(request.action).toBe("fs.read");
      expect(request.resource).toBe("/src/index.ts");
      expect(request.payload).toBeUndefined();
    });

    it("accepts valid request with file_write payload", () => {
      const payload: FileWritePayload = {
        type: "file_write",
        content: "hello world",
        create: true,
        append: false,
      };
      const request: ExecuteRequest = {
        mandate_id: "m_xyz789",
        action: "fs.write",
        resource: "/tmp/test.txt",
        payload,
      };
      expect(request.payload?.type).toBe("file_write");
    });

    it("accepts valid request with cli_exec payload", () => {
      const payload: CliExecPayload = {
        type: "cli_exec",
        command: "ls",
        args: ["-la"],
        cwd: "/tmp",
        timeout_ms: 5000,
      };
      const request: ExecuteRequest = {
        mandate_id: "m_cli456",
        action: "cli.exec",
        resource: "ls",
        payload,
      };
      expect(request.payload?.type).toBe("cli_exec");
    });

    it("accepts valid request with http_fetch payload", () => {
      const payload: HttpFetchPayload = {
        type: "http_fetch",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"key": "value"}',
      };
      const request: ExecuteRequest = {
        mandate_id: "m_http789",
        action: "http.fetch",
        resource: "https://api.example.com/data",
        payload,
      };
      expect(request.payload?.type).toBe("http_fetch");
    });
  });

  describe("ExecutePayload type guards", () => {
    it("isFileWritePayload returns true for valid file_write payload", () => {
      const payload = { type: "file_write", content: "test" };
      expect(isFileWritePayload(payload)).toBe(true);
    });

    it("isFileWritePayload returns false for invalid payload", () => {
      expect(isFileWritePayload({ type: "file_write" })).toBe(false);
      expect(isFileWritePayload({ type: "cli_exec", content: "test" })).toBe(false);
      expect(isFileWritePayload(null)).toBe(false);
      expect(isFileWritePayload("string")).toBe(false);
    });

    it("isCliExecPayload returns true for valid cli_exec payload", () => {
      const payload = { type: "cli_exec", command: "ls" };
      expect(isCliExecPayload(payload)).toBe(true);
    });

    it("isCliExecPayload returns false for invalid payload", () => {
      expect(isCliExecPayload({ type: "cli_exec" })).toBe(false);
      expect(isCliExecPayload({ type: "file_write", command: "ls" })).toBe(false);
    });

    it("isHttpFetchPayload returns true for valid http_fetch payload", () => {
      const payload = { type: "http_fetch", method: "GET" };
      expect(isHttpFetchPayload(payload)).toBe(true);
    });

    it("isHttpFetchPayload returns false for invalid payload", () => {
      expect(isHttpFetchPayload({ type: "http_fetch" })).toBe(false);
      expect(isHttpFetchPayload({ type: "file_write", method: "GET" })).toBe(false);
    });

    it("isExecutePayload returns true for any valid payload", () => {
      expect(isExecutePayload({ type: "file_write", content: "test" })).toBe(true);
      expect(isExecutePayload({ type: "cli_exec", command: "ls" })).toBe(true);
      expect(isExecutePayload({ type: "http_fetch", method: "GET" })).toBe(true);
    });

    it("isExecutePayload returns false for invalid payload", () => {
      expect(isExecutePayload({ type: "unknown" })).toBe(false);
      expect(isExecutePayload({})).toBe(false);
      expect(isExecutePayload(null)).toBe(false);
    });
  });

  describe("ExecuteResult type guards", () => {
    it("isFileReadResult returns true for valid file_read result", () => {
      const result: FileReadResult = {
        type: "file_read",
        content: "file content",
        size: 12,
        content_hash: "sha256:abc123",
      };
      expect(isFileReadResult(result)).toBe(true);
    });

    it("isFileReadResult returns false for invalid result", () => {
      expect(isFileReadResult({ type: "file_read", content: "test" })).toBe(false);
      expect(isFileReadResult({ type: "file_write", content: "test", size: 4, content_hash: "x" })).toBe(false);
    });

    it("isFileWriteResult returns true for valid file_write result", () => {
      const result: FileWriteResult = {
        type: "file_write",
        bytes_written: 100,
        content_hash: "sha256:def456",
      };
      expect(isFileWriteResult(result)).toBe(true);
    });

    it("isCliExecResult returns true for valid cli_exec result", () => {
      const result: CliExecResult = {
        type: "cli_exec",
        exit_code: 0,
        stdout: "output",
        stderr: "",
        duration_ms: 150,
      };
      expect(isCliExecResult(result)).toBe(true);
    });

    it("isHttpFetchResult returns true for valid http_fetch result", () => {
      const result: HttpFetchResult = {
        type: "http_fetch",
        status_code: 200,
        headers: { "content-type": "application/json" },
        body: '{"ok": true}',
        body_hash: "sha256:xyz789",
      };
      expect(isHttpFetchResult(result)).toBe(true);
    });

    it("isExecuteResult returns true for any valid result", () => {
      expect(isExecuteResult({ type: "file_read", content: "x", size: 1, content_hash: "h" })).toBe(true);
      expect(isExecuteResult({ type: "file_write", bytes_written: 1, content_hash: "h" })).toBe(true);
      expect(isExecuteResult({ type: "cli_exec", exit_code: 0, stdout: "", stderr: "", duration_ms: 1 })).toBe(true);
      expect(isExecuteResult({ type: "http_fetch", status_code: 200, headers: {}, body: "", body_hash: "h" })).toBe(true);
    });

    it("isExecuteResult returns false for invalid result", () => {
      expect(isExecuteResult({ type: "unknown" })).toBe(false);
      expect(isExecuteResult({})).toBe(false);
    });
  });

  describe("ExecuteResponse type guards", () => {
    it("isExecuteResponse returns true for successful response", () => {
      const response: ExecuteResponse = {
        success: true,
        result: {
          type: "file_read",
          content: "file content",
          size: 12,
          content_hash: "sha256:abc123",
        },
        audit_id: "exec_123",
        evidence_hash: "sha256:def456",
      };
      expect(isExecuteResponse(response)).toBe(true);
    });

    it("isExecuteResponse returns true for failure response", () => {
      const response: ExecuteResponse = {
        success: false,
        error: "Mandate not found",
        audit_id: "exec_456",
      };
      expect(isExecuteResponse(response)).toBe(true);
    });

    it("isExecuteResponse returns false for invalid response", () => {
      expect(isExecuteResponse({ success: true })).toBe(false);
      expect(isExecuteResponse({ audit_id: "x" })).toBe(false);
      expect(isExecuteResponse(null)).toBe(false);
      expect(isExecuteResponse("string")).toBe(false);
    });
  });

  describe("JSON serialization", () => {
    it("ExecuteRequest serializes correctly", () => {
      const request: ExecuteRequest = {
        mandate_id: "m_abc123",
        action: "fs.read",
        resource: "/src/index.ts",
      };
      const json = JSON.stringify(request);
      expect(json).toContain('"mandate_id":"m_abc123"');
      expect(json).toContain('"action":"fs.read"');

      const parsed = JSON.parse(json) as ExecuteRequest;
      expect(parsed.mandate_id).toBe("m_abc123");
    });

    it("ExecutePayload with file_write serializes correctly", () => {
      const payload: ExecutePayload = {
        type: "file_write",
        content: "hello world",
        create: true,
        append: false,
      };
      const json = JSON.stringify(payload);
      expect(json).toContain('"type":"file_write"');
      expect(json).toContain('"content":"hello world"');
    });

    it("ExecuteResponse serializes correctly", () => {
      const response: ExecuteResponse = {
        success: true,
        result: {
          type: "cli_exec",
          exit_code: 0,
          stdout: "output",
          stderr: "",
          duration_ms: 150,
        },
        audit_id: "exec_123",
      };
      const json = JSON.stringify(response);
      expect(json).toContain('"success":true');
      expect(json).toContain('"type":"cli_exec"');
      expect(json).toContain('"exit_code":0');
    });
  });
});

// Integration tests that require a running sidecar
describe("AuthorityClient execute integration", () => {
  const sidecarBaseUrl = process.env.SIDECAR_BASE_URL;
  const shouldRun = process.env.RUN_SIDECAR_INTEGRATION_TESTS === "true" && !!sidecarBaseUrl;
  const maybeIt = shouldRun ? it : it.skip;

  maybeIt("execute returns mandate_not_found for invalid mandate", async () => {
    const { AuthorityClient } = await import("../src/index.js");
    const client = new AuthorityClient({ baseUrl: sidecarBaseUrl as string, timeoutMs: 4000 });

    const result = await client.execute({
      mandate_id: "m_nonexistent",
      action: "fs.read",
      resource: "/tmp/test.txt",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  maybeIt("authorizeAndExecute works end-to-end", async () => {
    const { AuthorityClient } = await import("../src/index.js");
    const client = new AuthorityClient({ baseUrl: sidecarBaseUrl as string, timeoutMs: 4000 });

    // This test requires a sidecar with appropriate policy and a file that exists
    // Skip in most environments
    if (!process.env.SIDECAR_E2E_FILE_PATH) {
      return;
    }

    const result = await client.authorizeAndExecute({
      principal: "agent:test",
      action: "fs.read",
      resource: process.env.SIDECAR_E2E_FILE_PATH,
    });

    expect(result.success).toBe(true);
    expect(result.result?.type).toBe("file_read");
  });
});
