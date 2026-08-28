# covtrim

Token 高效覆盖率压缩工具：读取标准 **lcov** → 输出紧凑 TSV，供 LLM/agent 消费（省约一半 token）。0.1.0 已提供 `covtrim <lcov>` 核心命令。

## 目录

- `src/`    CLI 与核心逻辑（**编码规范** → `src/CLAUDE.md`）
- `tests/`  测试（**测试规范** → `tests/CLAUDE.md`）
- `dist/`   构建产物（tsup 输出，gitignore）

## 常用命令

```bash
pnpm dev           # 开发运行（tsx）
pnpm build         # 构建 → dist/
pnpm test          # 测试（vitest）
pnpm test:coverage # 覆盖率（含 lcov 报告）
pnpm dogfood       # dogfooding：covtrim 压缩自身覆盖率 lcov
pnpm lint          # ESLint
pnpm check-types   # tsc --noEmit
pnpm format        # Prettier
pnpm pack:check    # 发布内容预览（pack --dry-run）
```

## 技术栈

TypeScript（strict+）+ pnpm + commander + tsup + vitest + ESLint + Prettier。语言选型理由（未来 dsh 集成零摩擦）见 `README.md` Status。

## 文档规范

- CHANGELOG.md 以英文维护：版本条目用英文撰写（repo 面向国际用户）。

<!-- claude-mem-lite:begin v1 -->
## claude-mem-lite — persistent memory

PreToolUse hooks already run `mem_recall` for past lessons before Read/Edit/Write. The calls worth making proactively:

| When | Call |
|------|------|
| Before Edit/Write | hook already recalled; if a `#NN` lesson was injected, cite `#NN` next time you produce user-visible text (citing = adopting the feedback; uncited lessons decay) |
| After fixing a non-trivial bug | `mem_save(type="bugfix", lesson_learned="<root cause + fix>", importance=2)` |
| After a non-obvious architecture decision | `mem_save(type="decision", lesson_learned="<constraint + tradeoff>")` |
| Deferring to a future session | `mem_defer({title, priority:1|2|3, detail})`; when fixed, add `closes_deferred=[N]` to `mem_save` |
| Looking up past work / history | `mem_search "keywords"` · `mem_recent` · `mem_timeline` |

Path cost is round-trips, not milliseconds: the PreToolUse hook above already recalls (0 calls) — prefer it. For an explicit query, if these `mem_*` tools are deferred behind ToolSearch this session, the Bash CLI (exact path in the detail doc) is one call vs two (ToolSearch + call).

Full tool + CLI tables, citation/decay rules, and save discipline → `.claude/plugin_claude_mem_lite.md`
<!-- claude-mem-lite:end -->
