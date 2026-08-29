# Contributing to covtrim

Thanks for your interest in covtrim! This guide is for **human contributors** — it covers the development workflow, code style, and release process.

Looking for usage docs? See the [README](README.md). For an AI-oriented project map, see [CLAUDE.md](CLAUDE.md).

## Prerequisites

- **Node.js >= 20** (CI runs on Node 22)
- **pnpm** as the package manager

## Getting started

```bash
pnpm install
```

## Common commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Run the CLI in development (tsx) |
| `pnpm test` | Run tests (vitest) |
| `pnpm test:coverage` | Run tests with coverage (v8 → `coverage/lcov.info`) |
| `pnpm dogfood` | Compress our own coverage lcov with covtrim (see Dogfooding) |
| `pnpm test:integration:node` | Real node frameworks on the demo fixture (vitest/jest/c8/mocha/bun) |
| `pnpm test:integration:rust` | Real `cargo llvm-cov` on the rust-demo fixture |
| `pnpm test:integration:python` | Real `pytest-cov` on the python-demo fixture |
| `pnpm test:integration:deno` | Real `deno test` + `deno coverage --lcov` on the deno-demo fixture |
| `pnpm lint` | ESLint |
| `pnpm check-types` | `tsc --noEmit` |
| `pnpm build` | Build → `dist/` |
| `pnpm format` | Prettier |

Run `pnpm lint && pnpm check-types && pnpm test` before committing.

## Code style

TypeScript conventions live in [`src/CLAUDE.md`](src/CLAUDE.md). Key points:

- Strict types (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); no `any`, no non-null assertions
- `camelCase` variables, `PascalCase` types, `kebab-case` files; English identifiers
- Pure functions by default; side effects (I/O / global state) isolated
- CLI entry is `main(argv, io)` as a pure function + `CLIExit` exit signal (library-mode testable)

### Commits

- Small, focused commits — one logical change each
- Conventional prefixes: `feat` / `fix` / `docs` / `chore` / `ci`

## Testing

Test conventions live in [`tests/CLAUDE.md`](tests/CLAUDE.md). Key points:

- vitest, tests colocated under `tests/`
- Test behavior, not implementation; precise matchers (`toBe` / `toEqual`)
- CLI tests call `main(argv, io)` directly (library mode) — assert exit code + output, no subprocess
- Coverage threshold: lines / functions ≥ 80% (see `vitest.config.ts`)

## Releasing

covtrim ships to **npm** (as `covtrim`) and **GitHub Packages** (as `@yanqd0/covtrim`) from a git tag. Full process in [`docs/RELEASING.md`](docs/RELEASING.md):

1. Bump `version` in `package.json` (single source of truth)
2. Commit + tag (`vX.Y.Z`) + push the tag
3. The tag triggers the publish workflow (gate → test → publish)

## Dogfooding

`pnpm dogfood` runs vitest coverage (generating `coverage/lcov.info`), then compresses that lcov with covtrim itself — validating the tool against real lcov output. On the current 3 source files, token count drops from 607 to 23 (**−96%**).

## Integration tests (multi-language)

`covtrim node` / `covtrim rust` wrap real toolchains, so the integration suites (`tests/integration-*.itest.ts`) spawn them for real rather than mocking. They need a local multi-language environment.

**Local — default on.** Requires the toolchains themselves:

- Node: demo deps installed once via `pnpm install` in `tests/fixtures/projects/node-demo` (all frameworks live in that one `package.json`).
- Rust: `cargo` + `cargo-llvm-cov` (`cargo install cargo-llvm-cov`) + `rustup component add llvm-tools-preview`.
- Python: venv in `tests/fixtures/projects/python-demo` via `python3 -m venv .venv && .venv/bin/pip install pytest pytest-cov` (once).
- Deno: `Install Deno: https://deno.com` (once).

Run `pnpm test:integration:node`, `pnpm test:integration:rust`, `pnpm test:integration:python` and `pnpm test:integration:deno`. A missing single framework is auto-skipped; the rest still run.

**CI — default off.** GitHub Actions sets `CI=true`, so the suites auto-skip (CI has no Rust/Python toolchains). To override in any environment: `COVTRIM_RUN_INTEGRATION=1` forces them on, `COVTRIM_SKIP_INTEGRATION=1` forces them off.
