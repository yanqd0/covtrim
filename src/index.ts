#!/usr/bin/env node
import { Command, CommanderError } from 'commander';
import { readFileSync } from 'node:fs';
import pkg from '../package.json' with { type: 'json' };
import { parseLcov } from './lcov.ts';
import { toTsv, tokenStats } from './tsv.ts';

/** CLI 退出信号：库模式（测试）下由调用方捕获，不直接 process.exit。 */
export class CLIExit extends Error {
  constructor(public readonly code: number) {
    super(`cli exit ${code}`);
    this.name = 'CLIExit';
  }
}

const writeOut = (s: string): void => {
  process.stdout.write(`${s}\n`);
};

const writeErr = (s: string): void => {
  process.stderr.write(`${s}\n`);
};

export interface CliIo {
  stdout: (s: string) => void;
  stderr: (s: string) => void;
}

const defaultIo: CliIo = { stdout: writeOut, stderr: writeErr };

/**
 * CLI 入口（纯函数式，便于测试）。
 *
 * @param argv 完整参数（含 node 与脚本名两段，与 process.argv 同构）
 * @param io   输出通道，默认写 stdout
 * @returns    退出码（0 成功，非 0 失败）
 */
export function main(argv: string[], io: CliIo = defaultIo): number {
  const program = new Command();
  program
    .name('covtrim')
    .description('Token-efficient coverage report compressor for LLM/agent consumption.')
    .version(pkg.version);

  program
    .command('hello')
    .description('Print a greeting')
    .action(() => {
      io.stdout('Hello from covtrim!');
      throw new CLIExit(0);
    });

  program
    .argument('<lcovFile>', 'lcov coverage file to summarize')
    .description('Compress an lcov report into a compact TSV summary')
    .action((lcovFile: string) => {
      const code = runReport(lcovFile, io);
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
    throw err;
  }
  return 0;
}

/**
 * 读 lcov 文件 → 解析 → 输出 TSV 摘要；token 量化写 stderr。
 *
 * @returns 退出码（0 成功，1 失败）
 */
function runReport(lcovFile: string, io: CliIo): number {
  let text: string;
  try {
    text = readFileSync(lcovFile, 'utf8');
  } catch (err) {
    io.stderr(`covtrim: cannot read ${lcovFile}: ${(err as Error).message}`);
    return 1;
  }
  const records = parseLcov(text);
  if (records.length === 0) {
    io.stderr(`covtrim: no coverage records found in ${lcovFile}`);
    return 1;
  }
  const tsv = toTsv(records);
  io.stdout(tsv);
  const stats = tokenStats(text, tsv);
  io.stderr(`tokens: ${stats.inputTokens} → ${stats.outputTokens} (-${stats.savedPct}%)`);
  return 0;
}

// 直接以 bin 运行时执行；被 import（测试）时不触发。
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  process.exit(main(process.argv));
}
