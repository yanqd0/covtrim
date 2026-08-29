import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  detectNodeFramework,
  NODE_FRAMEWORKS,
  runDeno,
  runNodeFramework,
  runPython,
  runRust,
  type NodeFramework,
  type NodeFrameworkSpec,
  type SpawnFn,
} from '../src/runners.ts';

/** 按名称取框架规格（表内必有，守卫替代非空断言）。 */
function framework(name: NodeFramework): NodeFrameworkSpec {
  const spec = NODE_FRAMEWORKS.find((f) => f.name === name);
  if (spec === undefined) throw new Error(`framework ${name} not in table`);
  return spec;
}

/** 建临时项目（写入指定文件），返回目录；测试后删除。 */
function makeProject(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'covtrim-runner-'));
  for (const [name, content] of Object.entries(files)) {
    const target = join(dir, name);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return dir;
}

const okSpawn: SpawnFn = () => ({ status: 0, stderr: '' });

/** mock spawn：模拟工具写出 coverage/lcov.info 后成功（配合新鲜度校验）。 */
const fileOk = (lcov: string): SpawnFn => (_cmd, opts) => {
  mkdirSync(`${opts.cwd}/coverage`, { recursive: true });
  writeFileSync(`${opts.cwd}/coverage/lcov.info`, lcov);
  return { status: 0, stderr: '' };
};

const LCOV = 'SF:a.ts\nLF:5\nLH:3\nend_of_record\n';

describe('detectNodeFramework', () => {
  it('detects vitest from devDependencies', () => {
    const dir = makeProject({ 'package.json': '{"devDependencies":{"vitest":"^3"}}' });
    expect(detectNodeFramework(dir)).toBe('vitest');
    rmSync(dir, { recursive: true, force: true });
  });

  it('detects jest from jest.config', () => {
    const dir = makeProject({ 'package.json': '{}', 'jest.config.js': 'module.exports = {};' });
    expect(detectNodeFramework(dir)).toBe('jest');
    rmSync(dir, { recursive: true, force: true });
  });

  it('detects c8 from devDependencies', () => {
    const dir = makeProject({ 'package.json': '{"devDependencies":{"c8":"^10"}}' });
    expect(detectNodeFramework(dir)).toBe('c8');
    rmSync(dir, { recursive: true, force: true });
  });

  it('detects mocha+nyc from devDependencies', () => {
    const dir = makeProject({ 'package.json': '{"devDependencies":{"mocha":"^10","nyc":"^17"}}' });
    expect(detectNodeFramework(dir)).toBe('mocha-nyc');
    rmSync(dir, { recursive: true, force: true });
  });

  it('detects bun from a bun test script', () => {
    const dir = makeProject({ 'package.json': '{"scripts":{"test":"bun test"}}' });
    expect(detectNodeFramework(dir)).toBe('bun');
    rmSync(dir, { recursive: true, force: true });
  });

  it('does not misdetect bun from bun.lockb alone (package manager)', () => {
    const dir = makeProject({
      'package.json': '{"scripts":{"test":"node --test"}}',
      'bun.lockb': '',
    });
    expect(detectNodeFramework(dir)).toBe('node-test');
    rmSync(dir, { recursive: true, force: true });
  });

  it('detects node-test from scripts.test containing node --test', () => {
    const dir = makeProject({ 'package.json': '{"scripts":{"test":"node --test"}}' });
    expect(detectNodeFramework(dir)).toBe('node-test');
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns null when no framework matches', () => {
    const dir = makeProject({ 'package.json': '{}' });
    expect(detectNodeFramework(dir)).toBeNull();
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('runNodeFramework', () => {
  it('returns lcov on success (status 0 + coverage/lcov.info)', () => {
    const vitest = framework('vitest');
    const dir = makeProject({
      'package.json': '{"devDependencies":{"vitest":"^3"}}',
      'coverage/lcov.info': LCOV,
    });
    expect(runNodeFramework(vitest, [], dir, fileOk(LCOV))).toEqual({ ok: true, lcov: LCOV });
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports missing tool with install hint when spawn errors', () => {
    const jest = framework('jest');
    const missingSpawn: SpawnFn = () => ({ status: null, stderr: '', error: new Error('ENOENT') });
    const dir = makeProject({ 'package.json': '{}' });
    const r = runNodeFramework(jest, [], dir, missingSpawn);
    expect(r).toMatchObject({ ok: false, reason: 'missing-tool' });
    if (!r.ok) expect(r.message).toContain('npm i -D jest');
    rmSync(dir, { recursive: true, force: true });
  });

  it('forwards stderr and exit code when the command fails', () => {
    const c8 = framework('c8');
    const failSpawn: SpawnFn = () => ({ status: 2, stderr: 'Assertion failed: boom\n' });
    const dir = makeProject({ 'package.json': '{"devDependencies":{"c8":"^10"}}' });
    const r = runNodeFramework(c8, [], dir, failSpawn);
    expect(r).toMatchObject({ ok: false, reason: 'failed' });
    if (!r.ok) {
      expect(r.message).toContain('exit code 2');
      expect(r.message).toContain('boom');
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports no-lcov when the command succeeds without coverage/lcov.info', () => {
    const vitest = framework('vitest');
    const dir = makeProject({ 'package.json': '{"devDependencies":{"vitest":"^3"}}' });
    const r = runNodeFramework(vitest, [], dir, okSpawn);
    expect(r).toMatchObject({ ok: false, reason: 'no-lcov' });
    rmSync(dir, { recursive: true, force: true });
  });

  it('forwards args to the framework command', () => {
    const bun = framework('bun');
    const seen: string[][] = [];
    const spySpawn: SpawnFn = (cmd) => {
      seen.push(cmd);
      return { status: 0, stderr: '' };
    };
    const dir = makeProject({ 'package.json': '{}', 'bun.lockb': '', 'coverage/lcov.info': LCOV });
    runNodeFramework(bun, ['--only', 'math'], dir, spySpawn);
    expect(seen[0]).toEqual([
      'bun',
      'test',
      '--coverage',
      '--coverage-reporter',
      'lcov',
      '--only',
      'math',
    ]);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('runRust', () => {
  const RUST_LCOV = 'SF:src/lib.rs\nLF:5\nLH:3\nend_of_record\n';
  const okRust: SpawnFn = () => ({ status: 0, stdout: RUST_LCOV, stderr: '' });

  it('returns lcov from stdout on success', () => {
    const dir = makeProject({ 'package.json': '{}' });
    expect(runRust([], dir, okRust)).toEqual({ ok: true, lcov: RUST_LCOV });
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports missing cargo with rustup hint on spawn error', () => {
    const missing: SpawnFn = () => ({
      status: null,
      stdout: '',
      stderr: '',
      error: new Error('ENOENT'),
    });
    const dir = makeProject({ 'package.json': '{}' });
    const r = runRust([], dir, missing);
    expect(r).toMatchObject({ ok: false, reason: 'missing-cargo' });
    if (!r.ok) expect(r.message).toContain('https://rustup.rs');
    rmSync(dir, { recursive: true, force: true });
  });

  it('suggests installing cargo-llvm-cov when the plugin is missing', () => {
    const noPlugin: SpawnFn = () => ({
      status: 101,
      stdout: '',
      stderr: 'error: no such command: llvm-cov\n',
    });
    const dir = makeProject({ 'package.json': '{}' });
    const r = runRust([], dir, noPlugin);
    expect(r).toMatchObject({ ok: false, reason: 'missing-llvm-cov' });
    if (!r.ok) expect(r.message).toContain('cargo install cargo-llvm-cov');
    rmSync(dir, { recursive: true, force: true });
  });

  it('forwards stderr and exit code when tests fail', () => {
    const fail: SpawnFn = () => ({
      status: 101,
      stdout: '',
      stderr: 'test result: FAILED. 1 failed\n',
    });
    const dir = makeProject({ 'package.json': '{}' });
    const r = runRust([], dir, fail);
    expect(r).toMatchObject({ ok: false, reason: 'failed' });
    if (!r.ok) {
      expect(r.message).toContain('exit code 101');
      expect(r.message).toContain('1 failed');
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports no-lcov when stdout has no lcov', () => {
    const noLcov: SpawnFn = () => ({ status: 0, stdout: 'not lcov', stderr: '' });
    const dir = makeProject({ 'package.json': '{}' });
    const r = runRust([], dir, noLcov);
    expect(r).toMatchObject({ ok: false, reason: 'no-lcov' });
    rmSync(dir, { recursive: true, force: true });
  });

  it('forwards args to cargo llvm-cov', () => {
    const seen: string[][] = [];
    const spy: SpawnFn = (cmd) => {
      seen.push(cmd);
      return { status: 0, stdout: RUST_LCOV, stderr: '' };
    };
    const dir = makeProject({ 'package.json': '{}' });
    runRust(['--', '--test-threads=1'], dir, spy);
    expect(seen[0]).toEqual(['cargo', 'llvm-cov', '--lcov', '--', '--test-threads=1']);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('runPython', () => {
  const PY_LCOV = 'SF:src/math.py\nLF:4\nLH:2\nend_of_record\n';
  const okPy: SpawnFn = () => ({ status: 0, stderr: '' });

  it('returns lcov from coverage/lcov.info on success', () => {
    const dir = makeProject({ 'package.json': '{}', 'coverage/lcov.info': PY_LCOV });
    expect(runPython([], dir, fileOk(PY_LCOV))).toEqual({ ok: true, lcov: PY_LCOV });
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports missing pytest with pip hint on spawn error', () => {
    const missing: SpawnFn = () => ({
      status: null,
      stdout: '',
      stderr: '',
      error: new Error('ENOENT'),
    });
    const dir = makeProject({ 'package.json': '{}' });
    const r = runPython([], dir, missing);
    expect(r).toMatchObject({ ok: false, reason: 'missing-pytest' });
    if (!r.ok) expect(r.message).toContain('pip install pytest pytest-cov');
    rmSync(dir, { recursive: true, force: true });
  });

  it('forwards stderr and exit code when tests fail', () => {
    const fail: SpawnFn = () => ({
      status: 1,
      stdout: '',
      stderr: 'short test summary info: 1 failed\n',
    });
    const dir = makeProject({ 'package.json': '{}' });
    const r = runPython([], dir, fail);
    expect(r).toMatchObject({ ok: false, reason: 'failed' });
    if (!r.ok) {
      expect(r.message).toContain('exit code 1');
      expect(r.message).toContain('1 failed');
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports no-lcov when coverage/lcov.info is missing', () => {
    const dir = makeProject({ 'package.json': '{}' });
    const r = runPython([], dir, okPy);
    expect(r).toMatchObject({ ok: false, reason: 'no-lcov' });
    rmSync(dir, { recursive: true, force: true });
  });

  it('forwards args to pytest', () => {
    const seen: string[][] = [];
    const spy: SpawnFn = (cmd) => {
      seen.push(cmd);
      return { status: 0, stdout: '', stderr: '' };
    };
    const dir = makeProject({ 'package.json': '{}', 'coverage/lcov.info': PY_LCOV });
    runPython(['-x'], dir, spy);
    expect(seen[0]).toEqual(['pytest', '--cov', '--cov-report=lcov:coverage/lcov.info', '-x']);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('runDeno', () => {
  const DENO_LCOV = 'SF:src/math.ts\nLF:4\nLH:2\nend_of_record\n';
  /** 两步 mock：deno test 步成功 → deno coverage 步输出 lcov。 */
  const okDeno: SpawnFn = (cmd) =>
    cmd[1] === 'test'
      ? { status: 0, stdout: '', stderr: '' }
      : { status: 0, stdout: DENO_LCOV, stderr: '' };

  it('returns lcov from coverage stdout on success', () => {
    const dir = makeProject({ 'package.json': '{}' });
    expect(runDeno([], dir, okDeno)).toEqual({ ok: true, lcov: DENO_LCOV });
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports missing deno with install hint on spawn error', () => {
    const missing: SpawnFn = () => ({
      status: null,
      stdout: '',
      stderr: '',
      error: new Error('ENOENT'),
    });
    const dir = makeProject({ 'package.json': '{}' });
    const r = runDeno([], dir, missing);
    expect(r).toMatchObject({ ok: false, reason: 'missing-deno' });
    if (!r.ok) expect(r.message).toContain('https://deno.com');
    rmSync(dir, { recursive: true, force: true });
  });

  it('forwards stderr and exit code when deno test fails', () => {
    const fail: SpawnFn = () => ({ status: 1, stdout: '', stderr: 'FAILED\n' });
    const dir = makeProject({ 'package.json': '{}' });
    const r = runDeno([], dir, fail);
    expect(r).toMatchObject({ ok: false, reason: 'failed' });
    if (!r.ok) {
      expect(r.message).toContain('exit code 1');
      expect(r.message).toContain('FAILED');
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports no-lcov when coverage stdout has no lcov', () => {
    const noLcov: SpawnFn = (cmd) =>
      cmd[1] === 'test'
        ? { status: 0, stdout: '', stderr: '' }
        : { status: 0, stdout: 'nope', stderr: '' };
    const dir = makeProject({ 'package.json': '{}' });
    const r = runDeno([], dir, noLcov);
    expect(r).toMatchObject({ ok: false, reason: 'no-lcov' });
    rmSync(dir, { recursive: true, force: true });
  });

  it('forwards args to deno test', () => {
    const seen: string[][] = [];
    const spy: SpawnFn = (cmd) => {
      seen.push(cmd);
      return cmd[1] === 'test'
        ? { status: 0, stdout: '', stderr: '' }
        : { status: 0, stdout: DENO_LCOV, stderr: '' };
    };
    const dir = makeProject({ 'package.json': '{}' });
    runDeno(['--allow-read'], dir, spy);
    expect(seen[0]).toEqual(
      expect.arrayContaining(['deno', 'test', expect.stringContaining('--coverage='), '--allow-read'])
    );
    rmSync(dir, { recursive: true, force: true });
  });
});
