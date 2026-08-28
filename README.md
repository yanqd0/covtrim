# covtrim

Token-efficient coverage report compressor for LLM/agent consumption.
Reads the standard **lcov** format and outputs a compact TSV summary — the same information in roughly half the tokens.

## Install

```bash
npm install -g covtrim
# or 从 GitHub Packages 安装（scope 路由到 GitHub registry，避免依赖拉取失败）
npm config set @yanqd0:registry https://npm.pkg.github.com && npm install -g @yanqd0/covtrim
# 或免安装直接运行
npx covtrim <args>
```

## Usage

```bash
covtrim <lcovFile>           # 压缩 lcov → 未覆盖降序 TSV 摘要
covtrim <lcovFile> --tokens  # 附带 token 量化统计（写 stderr，默认关闭）
covtrim hello                # 打印问候（脚手架验证命令）
covtrim --version            # 版本号
covtrim --help               # 帮助
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

## Development

```bash
pnpm install         # 安装依赖
pnpm dev             # 开发运行（tsx）
pnpm test            # 测试（vitest）
pnpm test:coverage   # 覆盖率（v8 → coverage/lcov.info）
pnpm dogfood         # dogfooding：covtrim 压缩自身覆盖率 lcov
pnpm lint            # ESLint
pnpm check-types     # tsc --noEmit
pnpm build           # 构建 → dist/
```

**Dogfooding**：`pnpm dogfood` 先跑 vitest 覆盖率（生成 `coverage/lcov.info`），再用 covtrim 压缩自身 lcov 输出为 TSV——直接验证 covtrim 对真实 lcov 的价值。当前自身 3 个源文件：token 从 607 降到 23（**-96%**）。

## Status

0.1.0 in development, **TypeScript** (2026-08-26 decision). The language choice was driven by future integration with [dsh](https://github.com/deepseek-ai/deepseek-harness) (`@deepseek-ai/dsh`): its plugin ecosystem is npm packages installed via pnpm, and TypeScript is the zero-friction path. Roadmap: 0.2.0 adds multi-language coverage.

## License

[MIT](LICENSE)
