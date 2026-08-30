# CLAUDE.md: covtrim 项目导航

> 本文档是**编程 AI 的项目导航**：给出定位、硬约束与"去哪找权威信息"的指引。编码规范见 `src/CLAUDE.md`；测试规范见 `tests/CLAUDE.md`。

## 项目定位

Token 高效覆盖率压缩工具：读取标准 **lcov** → 输出紧凑 TSV 摘要（未覆盖降序），供 LLM/agent 消费，省约一半 token。TypeScript CLI（commander + tsup），核心命令 `covtrim <lcov>`（0.1.0 已就绪）。

## 硬约束

- **命令名 `covtrim`**；npm 双名发布：npmjs `covtrim` + GitHub Packages `@yanqd0/covtrim`（发布时临时改 name，见 `docs/RELEASING.md`）。
- **engines `node >=20`**；CI 测试/发布统一 node 22（action 用 v5+，node24 runtime）。
- **发布流程**：tag push 触发 `publish-npm.yml`（gate→test→publish→publish-github→release）；tag 与 package.json 版本一致。
- **小步快跑、小提交**：每个逻辑变更独立 commit（Angular 前缀 `feat`/`fix`/`docs`/`chore`/`ci`）。
- **dogfooding**：用 covtrim 压缩自身覆盖率（`pnpm dogfood`）验证价值。
- **文档分工（文件作用）**：README=对外推广/使用（用户）；CONTRIBUTING=对外开发须知（人类贡献者）；CLAUDE.md=对内 AI 导航；notes/=对内文档化记忆。新文档先定读者，再定放哪。
- **语言约束**：对外默认文件英文（README / CONTRIBUTING / CHANGELOG / LICENSE / docs/）；对内默认中文（CLAUDE.md / notes/ / 代码注释）；CLI 输出英文、标识符英文。

## 覆盖率纪律（强制）

> 对**所有**读取本文档的 AI 生效：覆盖率数据一律经 covtrim 压缩后再引用，禁止贴原始 lcov / vitest 长输出。

- 本仓库需要新鲜覆盖率 → `pnpm dogfood`（=`pnpm test:coverage` + `tsx src/index.ts --tokens coverage/lcov.info`）；`coverage/lcov.info` 已存在时可直接 `tsx src/index.ts --tokens coverage/lcov.info`。
- 他项目 / 临时 lcov → `covtrim <lcov>`（或 `npx covtrim <lcov>`）。
- 汇报格式：引用 top 未覆盖文件（`file / uncovered / total / pct`）+ 一句话解读（哪个文件缺测、差多少），不罗列全部行。
- commit 前自查：本次改动涉及的文件若出现在未覆盖列表，须说明理由或补测试后重跑 `pnpm dogfood`。

## 常用命令

```bash
pnpm dev           # 开发运行（tsx）
pnpm build         # 构建 → dist/
pnpm test          # 测试（vitest）
pnpm test:coverage # 覆盖率（含 lcov 报告）
pnpm dogfood       # dogfooding：covtrim 压缩自身覆盖率 lcov
pnpm lint          # ESLint
pnpm check-types   # tsc --noEmit
```

## 文档导航

- **`notes/` 是项目记忆目录**：文档化记忆（决策/规范/路线）放 notes/，索引见 `notes/MEMORY.md`。
- **`docs/RELEASING.md`**：发布流程。
- **`src/CLAUDE.md`**：TypeScript 编码规范。
- **`tests/CLAUDE.md`**：vitest 测试规范。

## 记忆约定

- 项目记忆由 **mem-lite** 管理（自动捕获 + 显式保存）。
- 重要决策 / bug 修复 → `mem_save`（`type=decision`/`bugfix`，附 `lesson_learned`）。
- 修改文件前 `mem_recall` 查历史；遗留事项 `mem_defer`（下次会话 SessionStart 展示）。
- 适合固化的文档化记忆写 `notes/`，与 mem-lite 运行中记忆分工。
