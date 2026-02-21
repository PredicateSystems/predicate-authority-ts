# Changelog

All notable changes to `@predicatesystems/authority` will be documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [Unreleased]

_No unreleased changes._

## [0.3.3] - 2026-02-20

### Added

- **Canonicalization module** for reproducible `state_hash` computation:
  - Terminal canonicalization: `canonicalizeTerminalSnapshot()`, `computeTerminalStateHash()`
  - Desktop accessibility canonicalization: `canonicalizeDesktopSnapshot()`, `computeDesktopStateHash()`
  - Utility functions: `normalizeText()`, `normalizeCommand()`, `stripAnsi()`, `normalizeTimestamps()`, `normalizeTranscript()`, `normalizePath()`, `hashEnvironment()`, `isSecretKey()`, `sha256()`
  - Schema versions: `TERMINAL_SCHEMA_VERSION` (`terminal:v1.0`), `DESKTOP_SCHEMA_VERSION` (`desktop:v1.0`)
- `useCanonicalHash` option in `buildTerminalStateEvidence()` and `buildDesktopAccessibilityStateEvidence()` for reproducible hashes with ANSI stripping, timestamp normalization, and whitespace collapsing.
- Cross-platform path normalization with `.` and `..` resolution.
- ANSI escape code stripping (256-color, true color, cursor movement, scroll, erase).
- UI tree deterministic hashing with child sorting by (role, name).
- 73+ canonicalization unit tests covering edge cases.

## [0.3.2] - Previous

### Added

- Initial TypeScript SDK scaffold for `@predicatesystems/authority`.
- `AuthorityClient` with sidecar authorize transport (`/v1/authorize` default, `/authorize` alias support).
- Typed client error model (`AuthorityClientError`) with network/timeout/protocol/http mapping.
- Authorization request/response contracts and runtime response guard.
- Contract fixtures and unit tests for allow/deny/error/path behavior.
- Optional sidecar integration test scaffold (`RUN_SIDECAR_INTEGRATION_TESTS=true`).
- GitHub Actions test and npm release workflows.
- Dual-license files (`MIT` + `Apache-2.0`), contributor guide, and project README.
