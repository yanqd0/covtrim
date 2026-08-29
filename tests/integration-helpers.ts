import { spawnSync } from 'node:child_process';

/**
 * 集成测试总开关：本地默认测，CI 默认跳过。
 * 显式覆盖：COVTRIM_RUN_INTEGRATION=1 强制跑；COVTRIM_SKIP_INTEGRATION=1 强制跳过。
 */
export function integrationEnabled(): boolean {
  if (process.env.COVTRIM_RUN_INTEGRATION === '1') return true;
  if (process.env.COVTRIM_SKIP_INTEGRATION === '1') return false;
  return process.env.CI !== 'true';
}

/** 拼接 PATH（多个 .bin + 现有 PATH）。 */
export function buildPath(...bins: string[]): string {
  return [...bins, process.env.PATH ?? ''].join(':');
}

/** 探测命令可用性（注入 PATH 与执行路径一致）。 */
export function toolAvailable(cmd: string, env: Record<string, string>): boolean {
  const r = spawnSync(cmd, ['--version'], { env, encoding: 'utf8' });
  return r.error === undefined && r.status === 0;
}
