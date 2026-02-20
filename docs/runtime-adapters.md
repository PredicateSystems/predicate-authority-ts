# Runtime Adapter Examples (TS Agent Frameworks)

This guide shows framework-agnostic adapter patterns you can drop into common TS
agent runtimes. The goal is to keep a single authority gate (`ActionGuard` or
`AuthorityClient`) in front of sensitive operations.

## Pattern 1: Guard a tool function (local mode)

Use `PolicyEngine + ActionGuard` when you want local evaluation in tests/dev or
controlled deployments.

```ts
import {
  ActionGuard,
  PolicyEngine,
  guardedHttp,
  type ActionRequest,
  type PolicyRule,
} from "@predicatesystems/authority";

const rules: PolicyRule[] = [
  {
    name: "allow-payments-post",
    effect: "allow",
    principals: ["agent:payments"],
    actions: ["http.post"],
    resources: ["https://api.example.com/payments"],
    required_labels: ["verified:user_presence"],
  },
];

const guard = new ActionGuard({ policyEngine: new PolicyEngine(rules) });

export async function paymentsTool(input: { amount: number; userId: string }) {
  const request: ActionRequest = {
    principal: { principal_id: "agent:payments" },
    action_spec: {
      action: "http.post",
      resource: "https://api.example.com/payments",
      intent: `create payment for ${input.userId}`,
    },
    state_evidence: { source: "browser", state_hash: "state_hash_here" },
    verification_evidence: {
      signals: [{ label: "verified:user_presence", status: "passed" }],
    },
  };

  const { value } = await guardedHttp({
    guard,
    request,
    url: "https://api.example.com/payments",
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    send: async (req) => {
      const response = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });
      return response.json();
    },
  });

  return value;
}
```

## Pattern 2: Sidecar-first gate for framework tool calls

Use this pattern when sidecar mode is your source of truth.

```ts
import { AuthorityClient, type AuthorizeRequest } from "@predicatesystems/authority";

const authority = new AuthorityClient({
  baseUrl: process.env.SIDECAR_BASE_URL ?? "http://127.0.0.1:8787",
});

export async function runGuardedTool(
  request: AuthorizeRequest,
  run: () => Promise<unknown>,
) {
  const decision = await authority.authorize(request);
  if (!decision.allowed) {
    throw new Error(`Denied: ${decision.reason}`);
  }
  return run();
}
```

## Pattern 3: Wrap shell/file operations explicitly

Use operation-specific wrapper helpers to avoid accidental direct execution:

- `guardedShell(...)`
- `guardedFileRead(...)`
- `guardedFileWrite(...)`
- `guardedHttp(...)`

Each helper returns `{ value, decision, mandate }` and throws
`AuthorizationDeniedError` on deny.

## Mapping tips for framework integrations

- Map framework/tool identity to `principal.principal_id` (for example,
  `agent:planner`, `agent:payments`).
- Map tool operation to `action_spec.action` (`shell.exec`, `file.read`,
  `file.write`, `http.post`).
- Map target object to `action_spec.resource` (URI-style strings are easiest to
  keep stable in policies).
- Keep `intent` human-readable and deterministic enough for audit correlation.

## Web-first evidence path

For browser-first runtimes, map page snapshots into canonical `state_evidence`
using `buildWebStateEvidence(...)`:

```ts
import { buildWebStateEvidence } from "@predicatesystems/authority";

const stateEvidence = buildWebStateEvidence({
  snapshot: {
    url: page.url(),
    title: "Checkout",
    dom_hash: "dom_hash_from_provider",
    visible_text_hash: "text_hash_from_provider",
    observed_at: new Date().toISOString(),
  },
});
```

This keeps evidence collection swappable: pass `stateHash` directly when an
external capture system already computes hashes, or inject a custom `hasher`
while preserving the same `StateEvidence` output contract.

If you are already using `sdk-ts` snapshot output, use
`webStateSnapshotFromRuntimeSnapshot(...)` or
`buildWebStateEvidenceFromRuntimeSnapshot(...)` to carry over `timestamp`,
`dominant_group_key`, and snapshot confidence diagnostics into authority
evidence.

## Non-web adapter interfaces (Phase 4 implementation target)

`ts-predicate-authority` now includes contract interfaces for non-web evidence
providers, while runtime implementations remain deferred:

- `TerminalEvidenceProvider` (`captureTerminalSnapshot()`)
- `DesktopAccessibilityEvidenceProvider` (`captureAccessibilitySnapshot()`)
- `VerificationSignalProvider` (`collectVerificationSignals()`)

Use helper builders to map provider snapshots into canonical authority evidence:

- `buildTerminalStateEvidence(...)`
- `buildDesktopAccessibilityStateEvidence(...)`
- `collectVerificationEvidence(...)`

This keeps non-web integrations pluggable without forcing a single backend
implementation in Phase 2.
