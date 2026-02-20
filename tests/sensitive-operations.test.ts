import { describe, expect, it, vi } from "vitest";
import {
  ActionGuard,
  type ActionRequest,
  AuthorizationDeniedError,
  PolicyEngine,
  type PolicyRule,
  guardedFileRead,
  guardedFileWrite,
  guardedHttp,
  guardedShell,
} from "../src/index.js";

function requestBase(action: string, resource: string): ActionRequest {
  return {
    principal: { principal_id: "agent:ops" },
    action_spec: {
      action,
      resource,
      intent: `execute ${action}`,
    },
    state_evidence: {
      source: "browser",
      state_hash: "state_123",
    },
    verification_evidence: {
      signals: [{ label: "verified:user_presence", status: "passed" }],
    },
  };
}

function allowRule(action: string, resource: string): PolicyRule {
  return {
    name: "allow-sensitive-op",
    effect: "allow",
    principals: ["agent:*"],
    actions: [action],
    resources: [resource],
    required_labels: ["verified:user_presence"],
  };
}

describe("Sensitive operation wrappers", () => {
  it("runs guarded shell operation when allowed", async () => {
    const guard = new ActionGuard({
      policyEngine: new PolicyEngine([allowRule("shell.exec", "shell://local")]),
    });
    const execute = vi.fn().mockResolvedValue("ok");
    const result = await guardedShell({
      guard,
      request: requestBase("shell.exec", "shell://local"),
      command: "echo hello",
      execute,
    });
    expect(result.value).toBe("ok");
    expect(result.decision.allowed).toBe(true);
    expect(execute).toHaveBeenCalledWith("echo hello");
  });

  it("runs guarded file read/write operations when allowed", async () => {
    const rules = [
      allowRule("file.read", "file:///tmp/notes.txt"),
      allowRule("file.write", "file:///tmp/notes.txt"),
    ];
    const guard = new ActionGuard({ policyEngine: new PolicyEngine(rules) });
    const read = vi.fn().mockResolvedValue("contents");
    const write = vi.fn().mockResolvedValue("written");

    const readResult = await guardedFileRead({
      guard,
      request: requestBase("file.read", "file:///tmp/notes.txt"),
      path: "/tmp/notes.txt",
      read,
    });
    const writeResult = await guardedFileWrite({
      guard,
      request: requestBase("file.write", "file:///tmp/notes.txt"),
      path: "/tmp/notes.txt",
      contents: "new content",
      write,
    });

    expect(readResult.value).toBe("contents");
    expect(writeResult.value).toBe("written");
    expect(read).toHaveBeenCalledWith("/tmp/notes.txt");
    expect(write).toHaveBeenCalledWith("/tmp/notes.txt", "new content");
  });

  it("runs guarded outbound HTTP operation when allowed", async () => {
    const guard = new ActionGuard({
      policyEngine: new PolicyEngine([allowRule("http.post", "https://api.example.com/payments")]),
    });
    const send = vi.fn().mockResolvedValue({ status: 200 });
    const result = await guardedHttp({
      guard,
      request: requestBase("http.post", "https://api.example.com/payments"),
      url: "https://api.example.com/payments",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{\"amount\":10}",
      send,
    });

    expect(result.value).toEqual({ status: 200 });
    expect(send).toHaveBeenCalledWith({
      url: "https://api.example.com/payments",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{\"amount\":10}",
    });
  });

  it("fails closed for denied operations", async () => {
    const guard = new ActionGuard({ policyEngine: new PolicyEngine([]) });
    const execute = vi.fn().mockResolvedValue("ok");
    await expect(
      guardedShell({
        guard,
        request: requestBase("shell.exec", "shell://local"),
        command: "echo denied",
        execute,
      }),
    ).rejects.toThrowError(AuthorizationDeniedError);
    expect(execute).not.toHaveBeenCalled();
  });
});
