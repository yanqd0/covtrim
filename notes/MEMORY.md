# MEMORY 索引

项目记忆目录：文档化记忆（决策/规范/路线）统一放 `notes/`，与 mem-lite 运行中记忆分离。

## 文档索引

- `docs/RELEASING.md` — 发布流程（双 registry + GitHub Release）
- `src/CLAUDE.md` — TypeScript 编码规范
- `tests/CLAUDE.md` — vitest 测试规范
- `CLAUDE.md` — 项目导航（入口）

## 决策记录

- 2026-08-28 发布策略：npmjs `covtrim` + GitHub Packages `@yanqd0/covtrim` 双名；tag 触发 GitHub Release（notes 自动提取 CHANGELOG）。
- 2026-08-28 CI Node：测试/发布统一 node 22，action 升 v5+（node24 runtime）消除弃用警告；engines 保持 `>=20`。
