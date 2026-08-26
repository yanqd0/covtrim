# Releasing covtrim

covtrim ships to **npm** from a single git tag. `git tag vX.Y.Z` + `git push origin vX.Y.Z` triggers the publish workflow (`.github/workflows/publish-npm.yml`). Regular pushes to `main` only run the CI gate (`.github/workflows/ci.yml`).

Pre-release versions (`0.5.0-alpha.1` style) are **skipped** — the `gate` job sets `is_stable=false`, only stable tags publish.

## 1. Configure trusted publishing (one-time)

npm → **Account settings → Access Tokens → Add a new pending publisher**:

- Owner: `yanqd0`, Repository: `yanqd0/covtrim`, Workflow: `publish-npm.yml`.

The workflow uses **OIDC** (`permissions: id-token: write`) + `npm publish --provenance` — no token needed after this one-time setup.

## 2. Release flow (per version)

```sh
# 1. Bump version (package.json is the single source of truth)
#    e.g. edit "version": "0.1.0"

# 2. Commit + tag + push (you, manually)
git add package.json pnpm-lock.yaml && git commit -m "chore(release): 0.1.0"
git tag v0.1.0                  # 不带 v 前缀亦可（0.1.0），两种均触发
git push origin v0.1.0          # ← the only remote gesture; triggers publish
```

3. Watch GitHub Actions: `Publish npm` → `gate` → `test` → `publish`.

## 3. Verify

```sh
npm install -g covtrim && covtrim --version
```

## Notes

- **Version sync**: the tag (`v0.1.0`) must match `package.json` `version` (`0.1.0`); the `gate` job fails otherwise.
- `npm publish --provenance` requires npm ≥ 11.5.1 — the workflow upgrades npm before publishing.
