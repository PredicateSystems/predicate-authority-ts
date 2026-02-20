import {
  ActionGuard,
  PolicyEngine,
  guardedFileRead,
  guardedFileWrite,
  guardedHttp,
  guardedShell,
  type ActionRequest,
  type PolicyRule,
} from "../src/index.js";

function makeRequest(action: string, resource: string, intent: string): ActionRequest {
  return {
    principal: { principal_id: "agent:demo" },
    action_spec: { action, resource, intent },
    state_evidence: { source: "browser", state_hash: "state_demo" },
    verification_evidence: {
      signals: [{ label: "verified:user_presence", status: "passed" }],
    },
  };
}

export async function runLocalWrapperDemo() {
  const rules: PolicyRule[] = [
    {
      name: "allow-shell",
      effect: "allow",
      principals: ["agent:demo"],
      actions: ["shell.exec"],
      resources: ["shell://local"],
      required_labels: ["verified:user_presence"],
    },
    {
      name: "allow-file",
      effect: "allow",
      principals: ["agent:demo"],
      actions: ["file.read", "file.write"],
      resources: ["file:///tmp/demo.txt"],
      required_labels: ["verified:user_presence"],
    },
    {
      name: "allow-http",
      effect: "allow",
      principals: ["agent:demo"],
      actions: ["http.post"],
      resources: ["https://api.example.com/demo"],
      required_labels: ["verified:user_presence"],
    },
  ];

  const guard = new ActionGuard({ policyEngine: new PolicyEngine(rules) });

  const shell = await guardedShell({
    guard,
    request: makeRequest("shell.exec", "shell://local", "run demo shell command"),
    command: "echo demo",
    execute: async () => "shell:ok",
  });

  const fileRead = await guardedFileRead({
    guard,
    request: makeRequest("file.read", "file:///tmp/demo.txt", "read demo file"),
    path: "/tmp/demo.txt",
    read: async () => "file:read",
  });

  const fileWrite = await guardedFileWrite({
    guard,
    request: makeRequest("file.write", "file:///tmp/demo.txt", "write demo file"),
    path: "/tmp/demo.txt",
    contents: "demo",
    write: async () => "file:write",
  });

  const http = await guardedHttp({
    guard,
    request: makeRequest("http.post", "https://api.example.com/demo", "post demo payload"),
    url: "https://api.example.com/demo",
    method: "POST",
    body: JSON.stringify({ demo: true }),
    send: async () => ({ ok: true }),
  });

  return {
    shell: shell.value,
    fileRead: fileRead.value,
    fileWrite: fileWrite.value,
    http: http.value,
  };
}
