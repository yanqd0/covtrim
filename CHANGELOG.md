# Change Log

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
