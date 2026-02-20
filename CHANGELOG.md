# Changelog

All notable changes to `@predicatesystems/authority` will be documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [Unreleased]

### Added

- Initial TypeScript SDK scaffold for `@predicatesystems/authority`.
- `AuthorityClient` with sidecar authorize transport (`/v1/authorize` default, `/authorize` alias support).
- Typed client error model (`AuthorityClientError`) with network/timeout/protocol/http mapping.
- Authorization request/response contracts and runtime response guard.
- Contract fixtures and unit tests for allow/deny/error/path behavior.
- Optional sidecar integration test scaffold (`RUN_SIDECAR_INTEGRATION_TESTS=true`).
- GitHub Actions test and npm release workflows.
- Dual-license files (`MIT` + `Apache-2.0`), contributor guide, and project README.
