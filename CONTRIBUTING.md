# Contributing

Thanks for contributing to `@predicatesystems/authority`.

## Development setup

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Branch and PR expectations

- branch from `main`,
- keep PRs focused and incremental,
- include tests/fixtures for behavior changes,
- keep sidecar compatibility (`/v1/authorize` contract) as default.

Before opening a PR:

```bash
npm run typecheck
npm test
npm run build
```

## Integration test mode (optional)

Run sidecar integration tests when you have a local running sidecar:

```bash
export SIDECAR_BASE_URL="http://127.0.0.1:8787"
npm run test:integration
```

## Release conventions

- npm package: `@predicatesystems/authority`
- release tag format: `vX.Y.Z` (for example `v0.1.0`)
- release workflow: `.github/workflows/release.yml`

Standard release flow:

1. update version/changelog as needed,
2. merge to `main`,
3. push tag `vX.Y.Z`,
4. verify GitHub Actions publish succeeds.

Manual publish path is also available through workflow dispatch with explicit
`version` input.

## Licensing

By contributing, you agree your contributions are dual-licensed under:

- MIT (`LICENSE-MIT`)
- Apache-2.0 (`LICENSE-APACHE`)
