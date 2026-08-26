#!/usr/bin/env node
import { Command, CommanderError } from 'commander';
import pkg from '../package.json' with { type: 'json' };

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

export interface CliIo {
  stdout: (s: string) => void;
}

/**
 * CLI 入口（纯函数式，便于测试）。
 *
 * @param argv 完整参数（含 node 与脚本名两段，与 process.argv 同构）
 * @param io   输出通道，默认写 stdout
 * @returns    退出码（0 成功，非 0 失败）
 */
export function main(argv: string[], io: CliIo = { stdout: writeOut }): number {
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

  program.configureOutput({
    writeOut: (s) => io.stdout(s.trimEnd()),
    writeErr: (s) => {
      process.stderr.write(s);
    },
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

// 直接以 bin 运行时执行；被 import（测试）时不触发。
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  process.exit(main(process.argv));
}
