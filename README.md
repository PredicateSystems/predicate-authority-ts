# Predicate Authority (TypeScript SDK)

**Deterministic Authority for AI Agents: secure sensitive actions with sidecar-backed, pre-execution authorization.**

[![License](https://img.shields.io/badge/License-MIT%2FApache--2.0-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@predicatesystems/authority.svg)](https://www.npmjs.com/package/@predicatesystems/authority)

`@predicatesystems/authority` is the TypeScript SDK companion to the Python
`predicate-authorityd` sidecar from [predicate-authority (Python)](https://github.com/PredicateSystems/predicate-authority). It keeps authority
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
- replacing Python sidecar/control-plane authority logic.

## Known Python Parity Baseline

This package targets compatibility with the current Python authority baseline in
[predicate-authority (Python)](https://github.com/PredicateSystems/predicate-authority):

- sidecar authorize route: `POST /v1/authorize` (`/authorize` compat alias),
- mandate/token baseline: ES256-default signing + standard JWT claim envelope,
- revocation baseline: explicit cascade semantics and global kill-switch runtime behavior,
- control-plane baseline: long-poll policy/revocation sync (runtime baseline),
- control-plane write hardening: replay freshness headers/signature support on Python client paths.

The TS SDK should preserve compatibility with these runtime behaviors before
adding TS-specific extensions.

## Installation

```bash
npm install @predicatesystems/authority
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

## Release

GitHub Actions workflows are included for:

- test/build checks on push/PR: `.github/workflows/test.yml`
- npm release on `v*` tags or manual dispatch: `.github/workflows/release.yml`

Required GitHub secret:

- `NPM_TOKEN` with publish access for `@predicatesystems`.

Release docs:

- `CHANGELOG.md`
- `docs/release-checklist.md`

## Contributing

See `CONTRIBUTING.md` for branch, test, integration, and release conventions.

## License

Dual-licensed under **MIT** and **Apache 2.0**:

- `LICENSE-MIT`
- `LICENSE-APACHE`

---

Copyright (c) 2026 Predicate Systems Contributors
