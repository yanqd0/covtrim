import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
  stdout?: string;
  stderr: string;
  signal?: NodeJS.Signals | null;
  error?: Error;
}
export type SpawnFn = (cmd: string[], opts: { cwd: string }) => SpawnResult;

/** 默认 spawn：同步执行命令并捕获输出（含 stdout，rust 用）。 */
export const defaultSpawn: SpawnFn = (cmd, opts) => {
  const [bin, ...rest] = cmd;
  if (bin === undefined) return { status: null, stderr: '', error: new Error('empty command') };
  const r = spawnSync(bin, rest, { cwd: opts.cwd, encoding: 'utf8' });
  // exactOptionalPropertyTypes：error 为 undefined 时省略该键，不显式赋值
  return r.error === undefined
    ? { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', signal: r.signal }
    : {
        status: r.status,
        stdout: r.stdout ?? '',
        stderr: r.stderr ?? '',
        signal: r.signal,
        error: r.error,
      };
};

/** 构造底层命令失败消息（区分被信号终止 / 普通退出码 / 未知状态）。 */
function spawnFailure(cmd: string[], r: SpawnResult): string {
  if (r.signal) {
    return `covtrim: ${cmd.join(' ')} killed by signal ${r.signal}\n${r.stderr.trimEnd()}`;
  }
  return `covtrim: ${cmd.join(' ')} failed with exit code ${r.status ?? 'unknown'}\n${r.stderr.trimEnd()}`;
}

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
        : ['c8', '--reporter=lcovonly', 'node', '--test', ...args],
    installHint: 'npm i -D c8',
  },
  {
    name: 'mocha-nyc',
    detect: (pkg) => hasDevDep(pkg, 'mocha') && hasDevDep(pkg, 'nyc'),
    cmd: (args) => ['nyc', '--reporter=lcov', 'mocha', ...args],
    installHint: 'npm i -D mocha nyc',
  },
  {
    name: 'node-test',
    detect: (pkg) => /node --test/.test(scriptTest(pkg)),
    cmd: (args) => ['c8', '--reporter=lcovonly', 'node', '--test', ...args],
    installHint: 'npm i -D c8',
  },
  {
    // bun 检测弱化：仅脚本含 bun test 或存在 bunfig.toml（避免 bun 仅作包管理器时误伤），置于末位兜底
    name: 'bun',
    detect: (pkg, files) =>
      /bun test/.test(scriptTest(pkg)) || files.includes('bunfig.toml'),
    cmd: (args) => ['bun', 'test', '--coverage', '--coverage-reporter', 'lcov', ...args],
    installHint: 'Install Bun: https://bun.sh',
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
  // spawn 前删残留 lcov：防止工具退出 0 却未重新生成时读到陈旧文件（审查 MEDIUM-2）
  rmSync(`${dir}/coverage/lcov.info`, { force: true });
  const r = spawn(cmd, { cwd: dir });
  if (r.error) {
    return {
      ok: false,
      reason: 'missing-tool',
      message: `covtrim: "${cmd[0]}" not found — ${fw.installHint}`,
    };
  }
  if (r.status !== 0) {
    return { ok: false, reason: 'failed', message: spawnFailure(cmd, r) };
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

/** rust 子命令运行结果。 */
export type RustRunResult =
  | { ok: true; lcov: string }
  | {
      ok: false;
      reason: 'missing-cargo' | 'missing-llvm-cov' | 'failed' | 'no-lcov';
      message: string;
    };

/**
 * 运行 `cargo llvm-cov --lcov [args]` 并取回 stdout lcov。
 *
 * 错误分层：spawn 失败（cargo 缺失）→ missing-cargo + rustup 提示；非 0 且 stderr 含 llvm-cov
 * （插件未装）→ missing-llvm-cov + cargo install 提示；非 0 其他（测试失败）→ failed + stderr 尾部；
 * 0 但 stdout 非 lcov → no-lcov。
 */
export function runRust(args: string[], dir: string, spawn: SpawnFn = defaultSpawn): RustRunResult {
  const cmd = ['cargo', 'llvm-cov', '--lcov', ...args];
  const r = spawn(cmd, { cwd: dir });
  if (r.error) {
    return {
      ok: false,
      reason: 'missing-cargo',
      message: 'covtrim: cargo not found — Install Rust: https://rustup.rs',
    };
  }
  if (r.status !== 0) {
    const pluginMissing = r.stderr.includes('llvm-cov');
    const hint = pluginMissing
      ? '\ncovtrim: run `cargo install cargo-llvm-cov` (plugin missing)'
      : '';
    return {
      ok: false,
      reason: pluginMissing ? 'missing-llvm-cov' : 'failed',
      message: `${spawnFailure(cmd, r)}${hint}`,
    };
  }
  const lcov = r.stdout ?? '';
  if (!lcov.includes('end_of_record')) {
    return {
      ok: false,
      reason: 'no-lcov',
      message: `covtrim: ${cmd.join(' ')} produced no lcov on stdout`,
    };
  }
  return { ok: true, lcov };
}

/** python 子命令运行结果。 */
export type PythonRunResult =
  | { ok: true; lcov: string }
  | { ok: false; reason: 'missing-pytest' | 'failed' | 'no-lcov'; message: string };

/**
 * 运行 `pytest --cov --cov-report=lcov:coverage/lcov.info [args]` 并读回 lcov 文件。
 *
 * 与 rust 不同：pytest-cov 的 lcov 报告器只写文件（不支持 stdout），故固定写到 coverage/lcov.info 再读。
 * 错误分层：spawn 失败（pytest 缺失）→ missing-pytest + pip 提示；非 0（测试失败）→ failed + stderr 尾部；
 * 0 但无 coverage/lcov.info → no-lcov。
 */
export function runPython(args: string[], dir: string, spawn: SpawnFn = defaultSpawn): PythonRunResult {
  const cmd = ['pytest', '--cov', '--cov-report=lcov:coverage/lcov.info', ...args];
  // spawn 前删残留 lcov：防止退出 0 却未重新生成时读到陈旧文件（审查 MEDIUM-2）
  rmSync(`${dir}/coverage/lcov.info`, { force: true });
  const r = spawn(cmd, { cwd: dir });
  if (r.error) {
    return {
      ok: false,
      reason: 'missing-pytest',
      message: 'covtrim: pytest not found — pip install pytest pytest-cov (or: uv pip install pytest pytest-cov)',
    };
  }
  if (r.status !== 0) {
    return { ok: false, reason: 'failed', message: spawnFailure(cmd, r) };
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

/** deno 子命令运行结果。 */
export type DenoRunResult =
  | { ok: true; lcov: string }
  | { ok: false; reason: 'missing-deno' | 'failed' | 'no-lcov'; message: string };

/**
 * 运行 deno 覆盖率链路（两步）：`deno test --coverage=<tmp>` 收集 → `deno coverage --lcov <tmp>` 输出 stdout。
 *
 * 与 rust 同通道（stdout lcov），但需两步 + 临时 profile 目录（os.tmpdir，finally 清理，不污染项目）。
 * 错误分层：step1 spawn 失败（deno 缺失）→ missing-deno + deno.com 提示；step1 非 0（测试失败）→ failed + stderr 尾部；
 * step2 失败 → failed；step2 stdout 无 lcov → no-lcov。
 */
export function runDeno(args: string[], dir: string, spawn: SpawnFn = defaultSpawn): DenoRunResult {
  const profileDir = mkdtempSync(join(tmpdir(), 'covtrim-deno-'));
  try {
    const testCmd = ['deno', 'test', `--coverage=${profileDir}`, ...args];
    const r1 = spawn(testCmd, { cwd: dir });
    if (r1.error) {
      return {
        ok: false,
        reason: 'missing-deno',
        message: 'covtrim: deno not found — Install Deno: https://deno.com',
      };
    }
    if (r1.status !== 0) {
      return { ok: false, reason: 'failed', message: spawnFailure(testCmd, r1) };
    }
    const covCmd = ['deno', 'coverage', '--lcov', profileDir];
    const r2 = spawn(covCmd, { cwd: dir });
    if (r2.error || r2.status !== 0) {
      return { ok: false, reason: 'failed', message: spawnFailure(covCmd, r2) };
    }
    const lcov = r2.stdout ?? '';
    if (!lcov.includes('end_of_record')) {
      return {
        ok: false,
        reason: 'no-lcov',
        message: `covtrim: ${covCmd.join(' ')} produced no lcov on stdout`,
      };
    }
    return { ok: true, lcov };
  } finally {
    rmSync(profileDir, { recursive: true, force: true });
  }
}
