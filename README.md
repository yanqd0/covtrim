# covtrim

[![npm](https://img.shields.io/npm/v/covtrim.svg)](https://www.npmjs.com/package/covtrim)
[![CI](https://github.com/yanqd0/covtrim/actions/workflows/ci.yml/badge.svg)](https://github.com/yanqd0/covtrim/actions)
[![codecov](https://codecov.io/gh/yanqd0/covtrim/graph/badge.svg)](https://codecov.io/gh/yanqd0/covtrim)

Token-efficient coverage report compressor for LLM/agent consumption.
Reads the standard **lcov** format and outputs a compact TSV summary — the same information in roughly half the tokens.

## Install

```bash
npm install -g covtrim
# or from GitHub Packages (scoped registry to avoid dependency fetch failures)
npm config set @yanqd0:registry https://npm.pkg.github.com && npm install -g @yanqd0/covtrim
# or run without installing
npx covtrim <args>
```

## Usage

```bash
covtrim <lcovFile>           # compress lcov → TSV summary sorted by uncovered lines
covtrim <lcovFile> --tokens  # include token-quantification stats (stderr, off by default)
covtrim --version            # print version
covtrim --help               # show help
```

## Why

- LLMs read coverage tables poorly: they mix hundreds of `test ... ok` log lines with the actual table, and general-purpose token optimizers (e.g. RTK) treat the table itself as noise and drop it.
- Coverage tools emit structured output (`cargo llvm-cov --json/--lcov`, `pytest --cov-report=lcov`) but have **no LLM-friendly layer** on top.
- `covtrim` fills exactly that gap: a thin, format-agnostic layer that turns lcov into an actionable digest.

## Planned features

- ✅ lcov parser (`SF` / `LF` / `LH` file-level counts) — implemented in 0.1.0
- ✅ Compact TSV summary sorted by uncovered lines — implemented in 0.1.0
- `--diff`: baseline regression detection (improved / regressed / newly-uncovered)
- `--fail-under <N>`: CI gate with exit code
- `--summary`: one-line digest for LLM context ("12 modules, 3 below 90%, needs X")
- Adapters: `llvm-cov` first; `pytest-cov` and more next (lcov core is language-agnostic)

## Status

Active development — see the [CHANGELOG](CHANGELOG.md) for the latest release.

## License

[MIT](LICENSE)
