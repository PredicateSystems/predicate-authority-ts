# Release Checklist

Use this checklist before publishing `@predicatesystems/authority`.

## 1) Scope and version

- [ ] Confirm release scope and PRs included.
- [ ] Update `package.json` version if releasing manually.
- [ ] Update `CHANGELOG.md` (`Unreleased` -> new version section).

## 2) Local validation

- [ ] `npm install`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] (optional) `SIDECAR_BASE_URL=... npm run test:integration`

## 3) CI and repository checks

- [ ] Latest `main` CI is green (`.github/workflows/test.yml`).
- [ ] Required repo secret exists: `NPM_TOKEN`.
- [ ] npm org/package access is verified for `@predicatesystems`.

## 4) Publish

Choose one:

- Tag-based: push `vX.Y.Z` tag to trigger `.github/workflows/release.yml`.
- Manual: run release workflow dispatch with explicit `version`.

- [ ] Verify npm publish step completed successfully.
- [ ] Verify package appears on npm (`npm view @predicatesystems/authority version`).

## 5) Post-release

- [ ] Create or update GitHub release notes.
- [ ] Announce release internally (and externally if needed).
- [ ] Start next iteration by adding items under `CHANGELOG.md` -> `Unreleased`.
