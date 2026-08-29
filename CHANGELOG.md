# Change Log

## 0.2.0

### Features

- Multi-language coverage input: auto-detect the lcov format and validate real samples from Rust / Python / Node tooling.
- New `covtrim node`: wraps 6 Node test frameworks (vitest / jest / c8 / mocha+nyc / bun / node:test) with auto-detection and `--framework`.
- New `covtrim rust`: wraps `cargo llvm-cov` and pipes lcov from stdout.
- New `covtrim python`: wraps pytest-cov and reads `coverage/lcov.info`.
- New `covtrim deno`: wraps built-in `deno test` + `deno coverage --lcov`.

### Others

- Docs: rewrite README in English (promotion & usage only), add CONTRIBUTING.md for human contributors, add doc-tier and language rules to CLAUDE.md.
- CI: upload coverage to Codecov and add the coverage badge.
- Tests: multi-language integration suites over real toolchains (node/rust/python/deno demo fixtures) behind a unified local/CI toggle.

## 0.1.1

### Others

- Remove the scaffold `hello` command; `covtrim <lcovFile>` is now the only entry.
- CI: upgrade `actions/checkout` & `actions/setup-node` to v5 (node24 runtime), dropping the Node 20 deprecation warning.
- CI: publish to GitHub Packages as `@yanqd0/covtrim` and auto-create a GitHub Release (notes extracted from CHANGELOG).
- Fix `--tokens` percentage sign when output grows (`+N%`, not `-N%`).
- Fix publish workflow tag filter so bare-version tags (`0.1.1`) also trigger.
- Docs: switch CHANGELOG to English; rewrite CLAUDE.md as a concise project navigation; add `notes/MEMORY.md`.
- Docs: document dual-name install (`covtrim` / `@yanqd0/covtrim`) in README.

## 0.1.0

### Features

- covtrim CLI: reads lcov and outputs a compact TSV summary sorted by uncovered lines, for LLM/agent consumption.
  - TypeScript scaffold (pnpm/tsup/vitest/ESLint/Prettier).
  - lcov parser (SF/LF/LH file-level counts, fault-tolerant).
  - Token quantification off by default, enabled via `--tokens`.

### Others

- Docs: layered CLAUDE.md specs (root overview + src coding conventions + tests conventions).
- CI: push/PR gates + tag-triggered npm auto-publish (OIDC trusted publishing).
- Tests: edge-case coverage and dogfooding flow (`pnpm dogfood`).
- Repo governance: `.claude` fully gitignored.
