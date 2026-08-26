# tests 测试规范（vitest）

> 项目总览见根 `CLAUDE.md`；编码规范见 `src/CLAUDE.md`。

## 组织与命名

- 测试与源码并列：`tests/<模块>.test.ts`（colocate）
- `it('描述行为')`，不用 `it('works')` 之类无信息名称
- `describe` 嵌套组织：`describe('模块')` → `describe('函数')` → `it(...)`

## 原则

- 测行为非实现；快、隔离、可重复、自验证（clear pass/fail）
- mock 仅外部依赖（网络/时间/文件系统）；内部纯函数走真实路径
- 覆盖边界：`null` / `undefined` / 空输入 / 边界值
- 精确匹配器（`toBe` / `toEqual`），不用 truthy 宽松断言

## CLI 测试

- 直接调用 `main(argv, io)`（library-mode），断言退出码与输出，不 spawn 子进程
- 覆盖：正常路径 / 错误路径 / 边界参数

## 覆盖率

- v8 provider；阈值见 `vitest.config.ts`（lines/functions ≥80%）
- 提交前 `pnpm test` 全绿

## fixtures

- `fixtures/` 放样例输入；用真实结构的数据，不虚构
