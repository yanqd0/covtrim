# Change Log

## 0.1.0

### Features

- covtrim CLI：读取 lcov 输出未覆盖降序的 TSV 摘要，供 LLM/agent 消费。
  - TypeScript 脚手架（pnpm/tsup/vitest/ESLint/Prettier）。
  - lcov 解析器（SF/LF/LH 文件级计数，容错）。
  - token 量化默认关闭，`--tokens` 显式启用。

### Others

- 文档：CLAUDE.md 分层规范设施（根总览 + src 编码规范 + tests 测试规范）。
- CI：push/PR 门禁 + tag 触发 npm 自动发布（OIDC 可信发布）。
- 测试：边界用例补全与 dogfooding 流程（`pnpm dogfood`）。
- 仓库治理：`.claude` 整体纳入 gitignore。
