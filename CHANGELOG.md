# Change Log

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
