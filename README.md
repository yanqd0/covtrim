# covtrim

Token-efficient coverage report compressor for LLM/agent consumption.
Reads the standard **lcov** format and outputs a compact TSV summary — the same information in roughly half the tokens.

## Install

```bash
npm install -g covtrim
# 或免安装直接运行
npx covtrim <args>
```

## Usage

```bash
covtrim hello          # 打印问候（脚手架验证命令）
covtrim --version      # 版本号
covtrim --help         # 帮助
```

> lcov → TSV 的核心命令随 0.2.0 提供。

## Why

- LLMs read coverage tables poorly: they mix hundreds of `test ... ok` log lines with the actual table, and general-purpose token optimizers (e.g. RTK) treat the table itself as noise and drop it.
- Coverage tools emit structured output (`cargo llvm-cov --json/--lcov`, `pytest --cov-report=lcov`) but have **no LLM-friendly layer** on top.
- `covtrim` fills exactly that gap: a thin, format-agnostic layer that turns lcov into an actionable digest.

## Planned features

- lcov parser (`SF` / `LF` / `LH` file-level counts)
- Compact TSV summary sorted by uncovered lines (only low-coverage modules by default)
- `--diff`: baseline regression detection (improved / regressed / newly-uncovered)
- `--fail-under <N>`: CI gate with exit code
- `--summary`: one-line digest for LLM context ("12 modules, 3 below 90%, needs X")
- Adapters: `llvm-cov` first; `pytest-cov` and more next (lcov core is language-agnostic)

## Status

0.1.0 in development, **TypeScript** (2026-08-26 decision). The language choice was driven by future integration with [dsh](https://github.com/deepseek-ai/deepseek-harness) (`@deepseek-ai/dsh`): its plugin ecosystem is npm packages installed via pnpm, and TypeScript is the zero-friction path. Roadmap: 0.2.0 adds multi-language coverage.

## License

[MIT](LICENSE)
