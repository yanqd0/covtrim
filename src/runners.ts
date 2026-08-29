import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

/** Node 测试框架标识。 */
export type NodeFramework = 'vitest' | 'jest' | 'c8' | 'mocha-nyc' | 'bun' | 'node-test';

/** 单个框架的封装规格：检测、命令构造、安装提示。 */
export interface NodeFrameworkSpec {
  name: NodeFramework;
  detect: (pkg: PackageJson, files: string[]) => boolean;
  cmd: (args: string[], pkg?: PackageJson) => string[];
  installHint: string;
}

/** 项目 package.json 的宽松结构（只读需要的字段）。 */
export interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  c8?: unknown;
}

/** spawn 结果抽象（便于测试注入 mock）。 */
export interface SpawnResult {
  status: number | null;
  stderr: string;
  error?: Error;
}
export type SpawnFn = (cmd: string[], opts: { cwd: string }) => SpawnResult;

/** 默认 spawn：同步执行命令并捕获输出。 */
export const defaultSpawn: SpawnFn = (cmd, opts) => {
  const [bin, ...rest] = cmd;
  if (bin === undefined) return { status: null, stderr: '', error: new Error('empty command') };
  const r = spawnSync(bin, rest, { cwd: opts.cwd, encoding: 'utf8' });
  // exactOptionalPropertyTypes：error 为 undefined 时省略该键，不显式赋值
  return r.error === undefined
    ? { status: r.status, stderr: r.stderr ?? '' }
    : { status: r.status, stderr: r.stderr ?? '', error: r.error };
};

const hasDevDep = (pkg: PackageJson, name: string): boolean =>
  pkg.devDependencies?.[name] !== undefined;

const scriptTest = (pkg: PackageJson): string => pkg.scripts?.test ?? '';

/** Node 测试框架表：优先级序 = 自动检测序。 */
export const NODE_FRAMEWORKS: NodeFrameworkSpec[] = [
  {
    name: 'vitest',
    detect: (pkg, files) =>
      hasDevDep(pkg, 'vitest') || files.some((f) => f.startsWith('vitest.config.')),
    cmd: (args) => ['vitest', 'run', '--coverage', ...args],
    installHint: 'npm i -D vitest @vitest/coverage-v8',
  },
  {
    name: 'jest',
    detect: (pkg, files) =>
      hasDevDep(pkg, 'jest') || files.some((f) => f.startsWith('jest.config.')),
    cmd: (args) => ['jest', '--coverage', ...args],
    installHint: 'npm i -D jest',
  },
  {
    name: 'c8',
    detect: (pkg, files) => hasDevDep(pkg, 'c8') || files.includes('.c8rc') || pkg.c8 !== undefined,
    cmd: (args, pkg) =>
      scriptTest(pkg ?? {}).includes('c8')
        ? ['npm', 'test', ...args]
        : ['c8', 'node', '--test', ...args],
    installHint: 'npm i -D c8',
  },
  {
    name: 'mocha-nyc',
    detect: (pkg) => hasDevDep(pkg, 'mocha') && hasDevDep(pkg, 'nyc'),
    cmd: (args) => ['nyc', '--reporter=lcov', 'mocha', ...args],
    installHint: 'npm i -D mocha nyc',
  },
  {
    name: 'bun',
    detect: (pkg, files) =>
      files.includes('bun.lock') || files.includes('bun.lockb') || hasDevDep(pkg, 'bun'),
    cmd: (args) => ['bun', 'test', '--coverage', '--coverage-reporter', 'lcov', ...args],
    installHint: 'Install Bun: https://bun.sh',
  },
  {
    name: 'node-test',
    detect: (pkg) => /node --test/.test(scriptTest(pkg)),
    cmd: (args) => ['c8', 'node', '--test', ...args],
    installHint: 'npm i -D c8',
  },
];

/** 读取项目 package.json（不存在或解析失败返回 null）。 */
export function readPackage(dir: string): PackageJson | null {
  try {
    return JSON.parse(readFileSync(`${dir}/package.json`, 'utf8')) as PackageJson;
  } catch {
    return null;
  }
}

function listDir(dir: string): string[] {
  try {
    return readdirSync(dir, 'utf8');
  } catch {
    return [];
  }
}

/** 按框架表序在项目目录内自动检测首个命中的框架。 */
export function detectNodeFramework(dir: string): NodeFramework | null {
  const pkg = readPackage(dir);
  const files = listDir(dir);
  for (const fw of NODE_FRAMEWORKS) {
    if (fw.detect(pkg ?? {}, files)) return fw.name;
  }
  return null;
}

/** 读取框架产物 coverage/lcov.info（不存在返回 null）。 */
export function readLcov(dir: string): string | null {
  try {
    return readFileSync(`${dir}/coverage/lcov.info`, 'utf8');
  } catch {
    return null;
  }
}

/** node 子命令运行结果。 */
export type NodeRunResult =
  | { ok: true; lcov: string }
  | { ok: false; reason: 'missing-tool' | 'failed' | 'no-lcov'; message: string };

/**
 * 运行框架命令并取回 lcov。
 *
 * 错误分层：spawn 失败（工具缺失）→ missing-tool + 安装提示；非 0 退出 → failed + stderr 尾部；
 * 0 退出但无 coverage/lcov.info → no-lcov。
 */
export function runNodeFramework(
  fw: NodeFrameworkSpec,
  args: string[],
  dir: string,
  spawn: SpawnFn = defaultSpawn
): NodeRunResult {
  const pkg = readPackage(dir);
  const cmd = fw.cmd(args, pkg ?? undefined);
  const r = spawn(cmd, { cwd: dir });
  if (r.error) {
    return {
      ok: false,
      reason: 'missing-tool',
      message: `covtrim: "${cmd[0]}" not found — ${fw.installHint}`,
    };
  }
  if (r.status !== 0) {
    return {
      ok: false,
      reason: 'failed',
      message: `covtrim: ${cmd.join(' ')} failed with exit code ${r.status}\n${r.stderr.trimEnd()}`,
    };
  }
  const lcov = readLcov(dir);
  if (lcov === null) {
    return {
      ok: false,
      reason: 'no-lcov',
      message: `covtrim: ${cmd.join(' ')} produced no coverage/lcov.info`,
    };
  }
  return { ok: true, lcov };
}
