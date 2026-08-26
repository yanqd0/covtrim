# src 编码规范（TypeScript）

> 项目总览见根 `CLAUDE.md`；测试规范见 `tests/CLAUDE.md`。

## 类型纪律

- tsconfig 已开 `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `verbatimModuleSyntax`，**不降级**
- 禁 `any`：用 `unknown` + 类型收窄；禁非空断言 `!`（用类型守卫）
- 禁 `@ts-ignore`：用 `@ts-expect-error` 且须在同行说明理由
- 禁 `enum` / `namespace`：用 `as const` 对象或字符串联合类型
- 类型导入必须 `import type`（`verbatimModuleSyntax` 强制）

## 命名

- 变量/函数 `camelCase`、类型 `PascalCase`、常量 `UPPER_SNAKE_CASE`、文件 `kebab-case`
- 标识符英文；人读注释用中文

## 不可变与纯函数

- `readonly` 属性、`const` 优先、`as const` 字面量；不就地修改入参
- 纯函数默认；副作用（I/O/全局状态）需标注或隔离

## 简单性

- 不提前抽象：第 3 次重复才抽象；约 20 行能写则不引依赖
- 文件 <200 行、函数 <50 行、嵌套 <4 层

## CLI 约定

- 入口为 `main(argv, io)` 纯函数式 + `CLIExit` 退出信号（库模式可测）；仅 bin 入口 `process.exit`
- 输出走 `io.stdout`，代码内不用 `console`

## 提交前

```bash
pnpm lint && pnpm check-types && pnpm test
```
