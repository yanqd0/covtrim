#!/usr/bin/env node
import { Command, CommanderError } from 'commander';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pkg from '../package.json' with { type: 'json' };
import { detectFormat } from './detect.ts';
import { parseLcov } from './lcov.ts';
import {
  detectNodeFramework,
  NODE_FRAMEWORKS,
  runNodeFramework,
  runPython,
  runRust,
  type NodeFrameworkSpec,
  type SpawnFn,
} from './runners.ts';
import { toTsv, tokenStats } from './tsv.ts';

/** CLI 退出信号：库模式（测试）下由调用方捕获，不直接 process.exit。 */
export class CLIExit extends Error {
  constructor(public readonly code: number) {
    super(`cli exit ${code}`);
    this.name = 'CLIExit';
  }
}

/* v8 ignore next 3 -- 默认输出通道，测试通过注入 io 替代 */
const writeOut = (s: string): void => {
  process.stdout.write(`${s}\n`);
};

/* v8 ignore next 3 -- 默认输出通道，测试通过注入 io 替代 */
const writeErr = (s: string): void => {
  process.stderr.write(`${s}\n`);
};

export interface CliIo {
  stdout: (s: string) => void;
  stderr: (s: string) => void;
}

/** main 依赖注入：node 子命令的工作目录与命令执行器（测试用）。 */
export interface MainDeps {
  cwd?: string;
  spawn?: SpawnFn;
}

const defaultIo: CliIo = { stdout: writeOut, stderr: writeErr };

/**
 * CLI 入口（纯函数式，便于测试）。
 *
 * @param argv 完整参数（含 node 与脚本名两段，与 process.argv 同构）
 * @param io   输出通道，默认写 stdout
 * @returns    退出码（0 成功，非 0 失败）
 */
export function main(argv: string[], io: CliIo = defaultIo, deps: MainDeps = {}): number {
  const program = new Command();
  program
    .name('covtrim')
    .description('Token-efficient coverage report compressor for LLM/agent consumption.')
    .version(pkg.version);

  program
    .argument('<lcovFile>', 'lcov coverage file to summarize')
    .option('--tokens', 'print token usage stats to stderr')
    .description('Compress an lcov report into a compact TSV summary')
    .action((lcovFile: string, opts: { tokens?: boolean }) => {
      const code = runReport(lcovFile, io, opts.tokens === true);
      if (code !== 0) throw new CLIExit(code);
    });

  program
    .command('node')
    .description('Run Node tests via the detected framework and compress coverage into TSV')
    .option('--framework <name>', 'test framework to use (auto-detected otherwise)')
    .argument('[args...]', 'arguments forwarded to the test runner')
    .action((args: string[], opts: { framework?: string }) => {
      // --tokens 声明在根命令：commander 同名 option 归父命令，故读根 opts
      const rootOpts = program.opts();
      const code = runNodeCommand(
        deps.cwd ?? process.cwd(),
        args,
        opts.framework,
        io,
        rootOpts.tokens === true,
        deps.spawn
      );
      if (code !== 0) throw new CLIExit(code);
    });

  program
    .command('rust')
    .description('Run Rust tests via cargo llvm-cov and compress coverage into TSV')
    .argument('[args...]', 'arguments forwarded to cargo llvm-cov')
    .action((args: string[]) => {
      // --tokens 声明在根命令：读根 opts（同 node 子命令）
      const rootOpts = program.opts();
      const code = runRustCommand(
        deps.cwd ?? process.cwd(),
        args,
        io,
        rootOpts.tokens === true,
        deps.spawn
      );
      if (code !== 0) throw new CLIExit(code);
    });

  program
    .command('python')
    .description('Run Python tests via pytest-cov and compress coverage into TSV')
    .argument('[args...]', 'arguments forwarded to pytest')
    .action((args: string[]) => {
      // --tokens 声明在根命令：读根 opts（同 node/rust）
      const rootOpts = program.opts();
      const code = runPythonCommand(
        deps.cwd ?? process.cwd(),
        args,
        io,
        rootOpts.tokens === true,
        deps.spawn
      );
      if (code !== 0) throw new CLIExit(code);
    });

  program.configureOutput({
    writeOut: (s) => io.stdout(s.trimEnd()),
    writeErr: (s) => io.stderr(s.trimEnd()),
  });
  program.exitOverride();

  try {
    program.parse(argv);
  } catch (err) {
    if (err instanceof CLIExit) return err.code;
    if (err instanceof CommanderError) return err.exitCode;
    /* v8 ignore next -- 仅捕获意外的非 CLI 错误 */
    throw err;
  }
  return 0;
}

/**
 * 读 lcov 文件 → 解析 → 输出 TSV 摘要；`--tokens` 时 token 量化写 stderr。
 *
 * @returns 退出码（0 成功，1 失败）
 */
function runReport(lcovFile: string, io: CliIo, showTokens: boolean): number {
  let text: string;
  try {
    text = readFileSync(lcovFile, 'utf8');
  } catch (err) {
    io.stderr(`covtrim: cannot read ${lcovFile}: ${(err as Error).message}`);
    return 1;
  }
  if (detectFormat(text) === 'unknown') {
    io.stderr(`covtrim: unsupported format in ${lcovFile} (supported: lcov)`);
    return 1;
  }
  const records = parseLcov(text);
  if (records.length === 0) {
    io.stderr(`covtrim: no coverage records found in ${lcovFile}`);
    return 1;
  }
  const tsv = toTsv(records);
  io.stdout(tsv);
  if (showTokens) {
    const stats = tokenStats(text, tsv);
    io.stderr(`tokens: ${stats.inputTokens} → ${stats.outputTokens} (${stats.savedPct >= 0 ? '-' : '+'}${Math.abs(stats.savedPct)}%)`);
  }
  return 0;
}

/**
 * `covtrim node`：检测/指定框架 → 运行测试 → 取 coverage/lcov.info → 输出 TSV。
 *
 * @param cwd        项目目录（detect 与 spawn 的基准）
 * @param framework  显式框架名（undefined → 自动检测）
 * @returns 退出码（0 成功，1 失败）
 */
function runNodeCommand(
  cwd: string,
  args: string[],
  framework: string | undefined,
  io: CliIo,
  showTokens: boolean,
  spawn?: SpawnFn
): number {
  const supported = NODE_FRAMEWORKS.map((f) => f.name).join(', ');
  let spec: NodeFrameworkSpec | undefined;
  if (framework !== undefined) {
    spec = NODE_FRAMEWORKS.find((f) => f.name === framework);
    if (!spec) {
      io.stderr(`covtrim: unknown framework "${framework}" (supported: ${supported})`);
      return 1;
    }
  } else {
    // detected 为 null 时 find 恒不命中（无 name 等于 null），无需非空断言
    spec = NODE_FRAMEWORKS.find((f) => f.name === detectNodeFramework(cwd));
    if (!spec) {
      io.stderr(`covtrim: no test framework detected in ${cwd} (supported: ${supported})`);
      return 1;
    }
  }
  const result = runNodeFramework(spec, args, cwd, spawn);
  if (!result.ok) {
    io.stderr(result.message);
    return 1;
  }
  const records = parseLcov(result.lcov);
  if (records.length === 0) {
    io.stderr('covtrim: no coverage records found in coverage/lcov.info');
    return 1;
  }
  const tsv = toTsv(records);
  io.stdout(tsv);
  if (showTokens) {
    const stats = tokenStats(result.lcov, tsv);
    io.stderr(
      `tokens: ${stats.inputTokens} → ${stats.outputTokens} (${stats.savedPct >= 0 ? '-' : '+'}${Math.abs(stats.savedPct)}%)`
    );
  }
  return 0;
}

/**
 * `covtrim rust`：运行 cargo llvm-cov → stdout lcov → 输出 TSV。
 *
 * @param cwd 项目目录（cargo 命令基准）
 * @returns 退出码（0 成功，1 失败）
 */
function runRustCommand(
  cwd: string,
  args: string[],
  io: CliIo,
  showTokens: boolean,
  spawn?: SpawnFn
): number {
  const result = runRust(args, cwd, spawn);
  if (!result.ok) {
    io.stderr(result.message);
    return 1;
  }
  const records = parseLcov(result.lcov);
  if (records.length === 0) {
    io.stderr('covtrim: no coverage records found in lcov output');
    return 1;
  }
  const tsv = toTsv(records);
  io.stdout(tsv);
  if (showTokens) {
    const stats = tokenStats(result.lcov, tsv);
    io.stderr(
      `tokens: ${stats.inputTokens} → ${stats.outputTokens} (${stats.savedPct >= 0 ? '-' : '+'}${Math.abs(stats.savedPct)}%)`
    );
  }
  return 0;
}

/**
 * `covtrim python`：运行 pytest-cov → 读 coverage/lcov.info → 输出 TSV。
 *
 * @param cwd 项目目录（pytest 命令基准）
 * @returns 退出码（0 成功，1 失败）
 */
function runPythonCommand(
  cwd: string,
  args: string[],
  io: CliIo,
  showTokens: boolean,
  spawn?: SpawnFn
): number {
  const result = runPython(args, cwd, spawn);
  if (!result.ok) {
    io.stderr(result.message);
    return 1;
  }
  const records = parseLcov(result.lcov);
  if (records.length === 0) {
    io.stderr('covtrim: no coverage records found in coverage/lcov.info');
    return 1;
  }
  const tsv = toTsv(records);
  io.stdout(tsv);
  if (showTokens) {
    const stats = tokenStats(result.lcov, tsv);
    io.stderr(
      `tokens: ${stats.inputTokens} → ${stats.outputTokens} (${stats.savedPct >= 0 ? '-' : '+'}${Math.abs(stats.savedPct)}%)`
    );
  }
  return 0;
}

// 直接以 bin 运行时执行（经 symlink 安装时 realpath 后仍命中）；被 import（测试）时不触发。
/* v8 ignore start -- bin 入口，子进程/手动运行才触发 */
if (process.argv[1]) {
  try {
    if (realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
      process.exit(main(process.argv));
    }
  } catch {
    // argv[1] 非可解析文件路径（库模式），跳过
  }
}
/* v8 ignore stop */
