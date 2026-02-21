# Predicate Authority (TypeScript SDK)

**Deterministic Authority for AI Agents: secure sensitive actions with sidecar-backed, pre-execution authorization.**

[![License](https://img.shields.io/badge/License-MIT%2FApache--2.0-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@predicatesystems/authority.svg)](https://www.npmjs.com/package/@predicatesystems/authority)

`@predicatesystems/authority` is the TypeScript SDK for Predicate Authority. It keeps authority
decisions in the sidecar and gives Node/TS runtimes a thin, typed client for
fail-closed pre-execution checks.

## Why Predicate Authority?

Most agent security failures come from over-broad delegated credentials and lack
of per-action runtime checks. Predicate Authority introduces short-lived mandates
bound to policy, identity, and evidence-backed state/intent checks.

- **Bridge, do not replace**: keep enterprise identity stacks (Entra/Okta/OIDC).
- **Fail-closed by default**: deny before execution when checks fail.
- **Deterministic binding**: decisions are tied to runtime evidence.
- **Provable controls**: reason codes and mandate IDs propagate to audit systems.

## Repository Scope

This TS repository currently focuses on:

- typed sidecar transport for `POST /v1/authorize`,
- request/response contracts for authorization flows,
- runtime wrapper primitives (incremental),
- CI/release scaffolding for npm package delivery.

Out of scope for this package:

- re-implementing policy engine or mandate logic in TypeScript,
- replacing sidecar/control-plane authority logic.

## Installation

```bash
npm install @predicatesystems/authority
```

### Sidecar Prerequisite

This SDK requires the **Predicate Authority Sidecar** daemon to be running. The sidecar is a lightweight Rust binary that handles policy evaluation and mandate signing.

| Resource | Link |
|----------|------|
| Sidecar Repository | [predicate-authority-sidecar](https://github.com/PredicateSystems/predicate-authority-sidecar) |
| Download Binaries | [Latest Releases](https://github.com/PredicateSystems/predicate-authority-sidecar/releases) |
| npm Package | [@predicatesystems/authorityd](https://www.npmjs.com/package/@predicatesystems/authorityd) |
| License | MIT / Apache 2.0 |

### Quick Sidecar Setup

**Option A: Install via npm (recommended)**

```bash
npm install @predicatesystems/authorityd

# The binary is automatically included for your platform
# Run with npx:
npx predicate-authorityd --help
```

**Option B: Manual download**

```bash
# Download from GitHub releases for your platform:
# https://github.com/PredicateSystems/predicate-authority-sidecar/releases

tar -xzf predicate-authorityd-darwin-arm64.tar.gz  # or your platform
chmod +x predicate-authorityd
```

### Running the Sidecar

The Rust sidecar uses **global CLI arguments** (before the `run` subcommand) or a **TOML config file**.

**Basic local mode:**

```bash
./predicate-authorityd \
  --host 127.0.0.1 \
  --port 8787 \
  --mode local_only \
  --policy-file policy.json \
  run
```

**Using environment variables:**

```bash
export PREDICATE_HOST=127.0.0.1
export PREDICATE_PORT=8787
export PREDICATE_MODE=local_only
export PREDICATE_POLICY_FILE=policy.json

./predicate-authorityd run
```

**Using a config file:**

```bash
# Generate example config
./predicate-authorityd init-config --output config.toml

# Run with config
./predicate-authorityd --config config.toml run
```

### Sidecar CLI Reference

```
GLOBAL OPTIONS (use before 'run'):
  -c, --config <FILE>           Path to TOML config file [env: PREDICATE_CONFIG]
      --host <HOST>             Host to bind to [env: PREDICATE_HOST] [default: 127.0.0.1]
      --port <PORT>             Port to bind to [env: PREDICATE_PORT] [default: 8787]
      --mode <MODE>             local_only or cloud_connected [env: PREDICATE_MODE]
      --policy-file <PATH>      Path to policy JSON [env: PREDICATE_POLICY_FILE]
      --identity-file <PATH>    Path to local identity registry [env: PREDICATE_IDENTITY_FILE]
      --log-level <LEVEL>       trace, debug, info, warn, error [env: PREDICATE_LOG_LEVEL]
      --control-plane-url <URL> Control-plane URL [env: PREDICATE_CONTROL_PLANE_URL]
      --tenant-id <ID>          Tenant ID [env: PREDICATE_TENANT_ID]
      --project-id <ID>         Project ID [env: PREDICATE_PROJECT_ID]
      --predicate-api-key <KEY> API key [env: PREDICATE_API_KEY]
      --sync-enabled            Enable control-plane sync [env: PREDICATE_SYNC_ENABLED]
      --fail-open               Fail open if control-plane unreachable [env: PREDICATE_FAIL_OPEN]

IDENTITY PROVIDER OPTIONS:
      --identity-mode <MODE>    local, local-idp, oidc, entra, or okta [env: PREDICATE_IDENTITY_MODE]
      --allow-local-fallback    Allow local/local-idp in cloud_connected mode
      --idp-token-ttl-s <SECS>  IdP token TTL seconds [default: 300]
      --mandate-ttl-s <SECS>    Mandate TTL seconds [default: 300]

LOCAL IDP OPTIONS (for identity-mode=local-idp):
      --local-idp-issuer <URL>  Issuer URL [env: LOCAL_IDP_ISSUER]
      --local-idp-audience <AUD> Audience [env: LOCAL_IDP_AUDIENCE]
      --local-idp-signing-key-env <VAR> Env var for signing key [default: LOCAL_IDP_SIGNING_KEY]

OIDC OPTIONS (for identity-mode=oidc):
      --oidc-issuer <URL>       Issuer URL [env: OIDC_ISSUER]
      --oidc-client-id <ID>     Client ID [env: OIDC_CLIENT_ID]
      --oidc-audience <AUD>     Audience [env: OIDC_AUDIENCE]

ENTRA OPTIONS (for identity-mode=entra):
      --entra-tenant-id <ID>    Tenant ID [env: ENTRA_TENANT_ID]
      --entra-client-id <ID>    Client ID [env: ENTRA_CLIENT_ID]
      --entra-audience <AUD>    Audience [env: ENTRA_AUDIENCE]

OKTA OPTIONS (for identity-mode=okta):
      --okta-issuer <URL>       Issuer URL [env: OKTA_ISSUER]
      --okta-client-id <ID>     Client ID [env: OKTA_CLIENT_ID]
      --okta-audience <AUD>     Audience [env: OKTA_AUDIENCE]
      --okta-required-claims    Required claims (comma-separated)
      --okta-required-scopes    Required scopes (comma-separated)
      --okta-required-roles     Required roles/groups (comma-separated)
      --okta-allowed-tenants    Allowed tenant IDs (comma-separated)

COMMANDS:
  run          Start the daemon (default)
  init-config  Generate example config file
  check-config Validate config file
  version      Show version info
```

### Identity Provider Modes

The sidecar supports multiple identity modes for token validation:

- **local** (default): No token validation. Suitable for development.
- **local-idp**: Self-issued JWT tokens for ephemeral task identities.
- **oidc**: Generic OIDC provider integration.
- **entra**: Microsoft Entra ID (Azure AD) integration.
- **okta**: Enterprise Okta integration with JWKS validation.

**Safety notes:**
- `idp-token-ttl-s` must be >= `mandate-ttl-s` (enforced at startup)
- In `cloud_connected` mode, `local` or `local-idp` requires `--allow-local-fallback`

### Cloud-connected sidecar (control-plane sync)

```bash
export PREDICATE_API_KEY="your-api-key"

./predicate-authorityd \
  --host 127.0.0.1 \
  --port 8787 \
  --mode cloud_connected \
  --policy-file policy.json \
  --control-plane-url https://api.predicatesystems.dev \
  --tenant-id your-tenant \
  --project-id your-project \
  --predicate-api-key "$PREDICATE_API_KEY" \
  --sync-enabled \
  run
```

## Quick Start

```ts
import { AuthorityClient, type AuthorizationRequest } from "@predicatesystems/authority";

const client = new AuthorityClient({
  baseUrl: "http://127.0.0.1:8787",
});

const request: AuthorizationRequest = {
  principal: "agent:payments",
  action: "http.post",
  resource: "https://finance.example.com/transfers",
  intent_hash: "intent-hash-placeholder",
  labels: ["verified:user_presence"],
};

const decision = await client.authorize(request);
if (!decision.allowed) {
  throw new Error(`Authority denied: ${decision.reason}`);
}
```

### Sidecar client retry/timeout tuning

```ts
import { AuthorityClient } from "@predicatesystems/authority";

const client = new AuthorityClient({
  baseUrl: "http://127.0.0.1:8787",
  timeoutMs: 2000,        // per-attempt timeout
  maxRetries: 2,          // retry budget on network/5xx failures
  backoffInitialMs: 200,  // linear backoff base (attempt * base)
});
```

### Choose your runtime mode

- **Sidecar client mode (recommended):** use `AuthorityClient` to call
  `predicate-authorityd` (`/v1/authorize`) as the authority source of truth.
- **Local guard mode (optional):** use `PolicyEngine + ActionGuard` for local
  evaluation in TS runtime flows (useful for tests/dev or controlled deployments).

### Local guard mode example (`PolicyEngine + ActionGuard`)

```ts
import {
  ActionGuard,
  PolicyEngine,
  type ActionRequest,
  type PolicyRule,
} from "@predicatesystems/authority";

const rules: PolicyRule[] = [
  {
    name: "allow-transfer-submit",
    effect: "allow",
    principals: ["agent:payments"],
    actions: ["http.post"],
    resources: ["https://finance.example.com/transfers"],
    required_labels: ["verified:user_presence"],
  },
];

const guard = new ActionGuard({
  policyEngine: new PolicyEngine(rules),
});

const request: ActionRequest = {
  principal: { principal_id: "agent:payments" },
  action_spec: {
    action: "http.post",
    resource: "https://finance.example.com/transfers",
    intent: "submit transfer #123",
  },
  state_evidence: { source: "browser", state_hash: "state_abc" },
  verification_evidence: {
    signals: [{ label: "verified:user_presence", status: "passed" }],
  },
};

const decision = guard.authorize(request);
if (!decision.allowed) {
  throw new Error(`Local guard denied: ${decision.reason}`);
}
```

### Runtime adapter examples (TS frameworks)

See `docs/runtime-adapters.md` for copy-paste adapter patterns that map common
agent/tool runtime operations to authority checks in both:

- sidecar-first mode (`AuthorityClient`), and
- local wrapper mode (`ActionGuard` + `guardedShell`/`guardedFile*`/`guardedHttp`).

### Web-first state evidence helper

Use `buildWebStateEvidence(...)` to map browser snapshot artifacts into canonical
`state_evidence`:

```ts
import { buildWebStateEvidence } from "@predicatesystems/authority";

const stateEvidence = buildWebStateEvidence({
  snapshot: {
    url: "https://app.example.com/transfer",
    title: "Transfer Funds",
    dom_hash: "dom_hash_here",
    visible_text_hash: "text_hash_here",
    observed_at: new Date().toISOString(),
  },
});
```

If your runtime already produces `sdk-ts` snapshots, use
`buildWebStateEvidenceFromRuntimeSnapshot(...)` to map `timestamp`,
`dominant_group_key`, and diagnostics confidence directly.

Non-web evidence contracts are also available for Phase 4 adapter work:
`TerminalEvidenceProvider`, `DesktopAccessibilityEvidenceProvider`, and
`VerificationSignalProvider` (see `docs/runtime-adapters.md`).

## Local Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

### Optional: sidecar integration tests

Run integration tests against a live `predicate-authorityd`:

```bash
export SIDECAR_BASE_URL="http://127.0.0.1:8787"
npm run test:integration
```

GitHub Actions `test.yml` also supports optional integration execution via
manual `workflow_dispatch` inputs (`run_integration`, `sidecar_base_url`).

For explicit allow/deny integration assertions, you can pass request fixtures:

```bash
export RUN_SIDECAR_INTEGRATION_TESTS=true
export SIDECAR_BASE_URL="http://127.0.0.1:8787"
export SIDECAR_ALLOW_REQUEST_JSON='{"principal":"agent:allow","action":"http.get","resource":"https://example.com","intent_hash":"ih_allow"}'
export SIDECAR_DENY_REQUEST_JSON='{"principal":"agent:deny","action":"http.post","resource":"https://example.com/admin","intent_hash":"ih_deny"}'
export SIDECAR_EXPECTED_DENY_REASON="missing_required_verification"
export SIDECAR_REQUIRE_MANDATE_ON_ALLOW=false
npm run test:integration
```

## Release

GitHub Actions workflows are included for:

- test/build checks on push/PR: `.github/workflows/test.yml`
- npm release on `v*` tags or manual dispatch: `.github/workflows/release.yml`
  - prerelease path: `rc-v*` tags publish to npm `next` dist-tag
- manual post-publish smoke evidence: `.github/workflows/post-publish-smoke.yml`

Required GitHub secret:

- `NPM_TOKEN` with publish access for `@predicatesystems`.

Release docs:

- `CHANGELOG.md`
- `docs/release-checklist.md`

Post-publish smoke:

```bash
npm run smoke:npm -- latest
# optional live sidecar authorize check
SIDECAR_BASE_URL=http://127.0.0.1:8787 npm run smoke:npm -- latest
```

## Contributing

See `CONTRIBUTING.md` for branch, test, integration, and release conventions.

## Troubleshooting

Common failure modes and first checks:

- `AuthorityClientError: timeout`
  - sidecar may be unreachable or overloaded; verify sidecar health and increase `timeoutMs` for slow environments.
- `AuthorityClientError: network_error`
  - check `baseUrl`, local networking, and whether `predicate-authorityd` is listening on expected host/port.
- `AuthorityClientError: protocol_error`
  - sidecar returned non-JSON or unexpected payload shape; verify sidecar version compatibility.
- `AuthorityClientError: bad_request`
  - request payload is invalid for `/v1/authorize`; compare fields with the fixture examples in `tests/fixtures/`.
- Frequent retries before success
  - tune `maxRetries` and `backoffInitialMs`; investigate sidecar/host resource pressure.

## License

Dual-licensed under **MIT** and **Apache 2.0**:

- `LICENSE-MIT`
- `LICENSE-APACHE`

---

Copyright (c) 2026 Predicate Systems Contributors
