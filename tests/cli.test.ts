import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { main } from '../src/index.ts';
import type { SpawnFn } from '../src/runners.ts';

/** 建临时项目（写入指定文件），返回目录；测试后删除。 */
function makeProj(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'covtrim-cli-'));
  for (const [name, content] of Object.entries(files)) {
    const target = join(dir, name);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return dir;
}

function run(argv: string[]): { code: number; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  const code = main(['node', 'covtrim', ...argv], {
    stdout: (s) => out.push(s),
    stderr: (s) => err.push(s),
  });
  return { code, out, err };
}

/** 在指定目录 + mock spawn 下运行 `covtrim node`。 */
function runNodeIn(
  dir: string,
  argv: string[],
  spawn: SpawnFn
): { code: number; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  const code = main(
    ['node', 'covtrim', 'node', ...argv],
    {
      stdout: (s) => out.push(s),
      stderr: (s) => err.push(s),
    },
    { cwd: dir, spawn }
  );
  return { code, out, err };
}

/** 在指定目录 + mock spawn 下运行 `covtrim rust`。 */
function runRustIn(
  dir: string,
  argv: string[],
  spawn: SpawnFn
): { code: number; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  const code = main(
    ['node', 'covtrim', 'rust', ...argv],
    {
      stdout: (s) => out.push(s),
      stderr: (s) => err.push(s),
    },
    { cwd: dir, spawn }
  );
  return { code, out, err };
}

/** 在指定目录 + mock spawn 下运行 `covtrim python`。 */
function runPythonIn(
  dir: string,
  argv: string[],
  spawn: SpawnFn
): { code: number; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  const code = main(
    ['node', 'covtrim', 'python', ...argv],
    {
      stdout: (s) => out.push(s),
      stderr: (s) => err.push(s),
    },
    { cwd: dir, spawn }
  );
  return { code, out, err };
}

/** 在指定目录 + mock spawn 下运行 `covtrim deno`。 */
function runDenoIn(
  dir: string,
  argv: string[],
  spawn: SpawnFn
): { code: number; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  const code = main(
    ['node', 'covtrim', 'deno', ...argv],
    {
      stdout: (s) => out.push(s),
      stderr: (s) => err.push(s),
    },
    { cwd: dir, spawn }
  );
  return { code, out, err };
}

const okSpawn: SpawnFn = () => ({ status: 0, stderr: '' });

/** mock spawn：模拟工具写出 coverage/lcov.info 后成功（配合新鲜度校验）。 */
function fileSpawn(lcov: string): SpawnFn {
  return (_cmd, opts) => {
    mkdirSync(`${opts.cwd}/coverage`, { recursive: true });
    writeFileSync(`${opts.cwd}/coverage/lcov.info`, lcov);
    return { status: 0, stderr: '' };
  };
}

const NODE_LCOV = 'SF:src/math.js\nLF:4\nLH:3\nend_of_record\n';
const RUST_LCOV = 'SF:src/lib.rs\nLF:5\nLH:3\nend_of_record\n';
const PY_LCOV = 'SF:src/math.py\nLF:4\nLH:2\nend_of_record\n';
const DENO_LCOV = 'SF:src/math.ts\nLF:4\nLH:2\nend_of_record\n';

describe('covtrim CLI', () => {
  it('reports the version', () => {
    const { out } = run(['--version']);
    expect(out.join('\n')).toMatch(/\d+\.\d+\.\d+/);
  });

  describe('report (default command)', () => {
    it('compresses an lcov file into sorted TSV', () => {
      const { code, out, err } = run(['fixtures/sample.info']);
      expect(code).toBe(0);
      const tsv = out.join('\n');
      expect(tsv.startsWith('file\tuncovered\ttotal\tpct')).toBe(true);
      expect(tsv).toContain('src/bar.ts\t2\t3\t33.3');
      expect(tsv).toContain('src/foo.ts\t2\t5\t60.0');
      expect(tsv).toContain('src/baz.ts\t0\t2\t100.0');
      // 未覆盖降序，同值按文件名升序：bar, foo, baz
      expect(
        tsv
          .split('\n')
          .slice(1)
          .map((l) => l.split('\t')[0])
      ).toEqual(['src/bar.ts', 'src/foo.ts', 'src/baz.ts']);
      expect(err.join('\n')).not.toContain('tokens:');
    });

    it('prints token stats only with --tokens', () => {
      const { code, out, err } = run(['--tokens', 'fixtures/sample.info']);
      expect(code).toBe(0);
      expect(out.join('\n')).toContain('file\tuncovered\ttotal\tpct');
      expect(err.join('\n')).toMatch(/tokens: \d+ → \d+ \(-\d+%\)/);
    });

    it('shows a plus when output exceeds input (tiny input)', () => {
      const { code, err } = run(['--tokens', 'fixtures/tiny.info']);
      expect(code).toBe(0);
      expect(err.join('\n')).toMatch(/tokens: \d+ → \d+ \(\+\d+%\)/);
    });

    it('exits 1 for a missing input file', () => {
      const { code, err } = run(['nope.info']);
      expect(code).toBe(1);
      expect(err.join('\n')).toContain('cannot read');
    });

    it('exits 1 for unsupported format (non-lcov input)', () => {
      const { code, err } = run(['package.json']);
      expect(code).toBe(1);
      expect(err.join('\n')).toContain('unsupported format');
    });

    it('processes an edge-case lcov file', () => {
      const { code, out } = run(['fixtures/edge.info']);
      expect(code).toBe(0);
      const files = out
        .join('\n')
        .split('\n')
        .slice(1)
        .map((l) => l.split('\t')[0]);
      expect(files).toEqual(['dup.ts', 'dup.ts', 'zero.ts']);
    });

    it('exits 1 for an empty file (unsupported format)', () => {
      const { code, err } = run(['fixtures/empty.info']);
      expect(code).toBe(1);
      expect(err.join('\n')).toContain('unsupported format');
    });
  });

  describe('node command', () => {
    it('runs the detected framework and prints TSV', () => {
      const dir = makeProj({
        'package.json': '{"devDependencies":{"vitest":"^3"}}',
        'coverage/lcov.info': NODE_LCOV,
      });
      const { code, out } = runNodeIn(dir, [], fileSpawn(NODE_LCOV));
      expect(code).toBe(0);
      expect(out.join('\n')).toBe('file\tuncovered\ttotal\tpct\nsrc/math.js\t1\t4\t75.0');
      rmSync(dir, { recursive: true, force: true });
    });

    it('respects --framework override', () => {
      const dir = makeProj({ 'package.json': '{}', 'coverage/lcov.info': NODE_LCOV });
      const { code, out } = runNodeIn(dir, ['--framework', 'jest'], fileSpawn(NODE_LCOV));
      expect(code).toBe(0);
      expect(out.join('\n')).toContain('src/math.js');
      rmSync(dir, { recursive: true, force: true });
    });

    it('errors on unknown framework', () => {
      const dir = makeProj({ 'package.json': '{}' });
      const { code, err } = runNodeIn(dir, ['--framework', 'bogus'], okSpawn);
      expect(code).toBe(1);
      expect(err.join('\n')).toContain('unknown framework "bogus"');
      rmSync(dir, { recursive: true, force: true });
    });

    it('errors when no framework is detected', () => {
      const dir = makeProj({ 'package.json': '{}' });
      const { code, err } = runNodeIn(dir, [], okSpawn);
      expect(code).toBe(1);
      expect(err.join('\n')).toContain('no test framework detected');
      rmSync(dir, { recursive: true, force: true });
    });

    it('forwards missing-tool install hint when spawn errors', () => {
      const dir = makeProj({ 'package.json': '{"devDependencies":{"vitest":"^3"}}' });
      const missingSpawn: SpawnFn = () => ({
        status: null,
        stderr: '',
        error: new Error('ENOENT'),
      });
      const { code, err } = runNodeIn(dir, [], missingSpawn);
      expect(code).toBe(1);
      expect(err.join('\n')).toContain('npm i -D vitest @vitest/coverage-v8');
      rmSync(dir, { recursive: true, force: true });
    });

    it('forwards test failure stderr and exit code', () => {
      const dir = makeProj({ 'package.json': '{"devDependencies":{"jest":"^29"}}' });
      const failSpawn: SpawnFn = () => ({ status: 1, stderr: 'intentional\n' });
      const { code, err } = runNodeIn(dir, ['--framework', 'jest'], failSpawn);
      expect(code).toBe(1);
      expect(err.join('\n')).toContain('exit code 1');
      expect(err.join('\n')).toContain('intentional');
      rmSync(dir, { recursive: true, force: true });
    });

    it('reports no-lcov when the test passes without coverage output', () => {
      const dir = makeProj({ 'package.json': '{"devDependencies":{"vitest":"^3"}}' });
      const { code, err } = runNodeIn(dir, [], okSpawn);
      expect(code).toBe(1);
      expect(err.join('\n')).toContain('produced no coverage/lcov.info');
      rmSync(dir, { recursive: true, force: true });
    });

    it('prints token stats with --tokens', () => {
      const dir = makeProj({
        'package.json': '{"devDependencies":{"vitest":"^3"}}',
        'coverage/lcov.info': NODE_LCOV,
      });
      const { code, err } = runNodeIn(dir, ['--tokens'], fileSpawn(NODE_LCOV));
      expect(code).toBe(0);
      // 小输入下输出可能更大，符号可为 + 或 -（同 #644 教训）
      expect(err.join('\n')).toMatch(/tokens: \d+ → \d+ \([+-]\d+%\)/);
      rmSync(dir, { recursive: true, force: true });
    });
  });

  describe('rust command', () => {
    const rustOk: SpawnFn = () => ({ status: 0, stdout: RUST_LCOV, stderr: '' });

    it('runs cargo llvm-cov and prints TSV from stdout', () => {
      const dir = makeProj({ 'package.json': '{}' });
      const { code, out } = runRustIn(dir, [], rustOk);
      expect(code).toBe(0);
      expect(out.join('\n')).toBe('file\tuncovered\ttotal\tpct\nsrc/lib.rs\t2\t5\t60.0');
      rmSync(dir, { recursive: true, force: true });
    });

    it('prints token stats with --tokens', () => {
      const dir = makeProj({ 'package.json': '{}' });
      const { code, err } = runRustIn(dir, ['--tokens'], rustOk);
      expect(code).toBe(0);
      expect(err.join('\n')).toMatch(/tokens: \d+ → \d+ \([+-]\d+%\)/);
      rmSync(dir, { recursive: true, force: true });
    });

    it('forwards missing-cargo install hint', () => {
      const dir = makeProj({ 'package.json': '{}' });
      const missing: SpawnFn = () => ({
        status: null,
        stdout: '',
        stderr: '',
        error: new Error('ENOENT'),
      });
      const { code, err } = runRustIn(dir, [], missing);
      expect(code).toBe(1);
      expect(err.join('\n')).toContain('https://rustup.rs');
      rmSync(dir, { recursive: true, force: true });
    });

    it('forwards test failure stderr and exit code', () => {
      const dir = makeProj({ 'package.json': '{}' });
      const fail: SpawnFn = () => ({ status: 101, stdout: '', stderr: '1 failed\n' });
      const { code, err } = runRustIn(dir, [], fail);
      expect(code).toBe(1);
      expect(err.join('\n')).toContain('exit code 101');
      expect(err.join('\n')).toContain('1 failed');
      rmSync(dir, { recursive: true, force: true });
    });
  });

  describe('python command', () => {
    it('runs pytest-cov and prints TSV from coverage/lcov.info', () => {
      const dir = makeProj({ 'package.json': '{}', 'coverage/lcov.info': PY_LCOV });
      const { code, out } = runPythonIn(dir, [], fileSpawn(PY_LCOV));
      expect(code).toBe(0);
      expect(out.join('\n')).toBe('file\tuncovered\ttotal\tpct\nsrc/math.py\t2\t4\t50.0');
      rmSync(dir, { recursive: true, force: true });
    });

    it('prints token stats with --tokens', () => {
      const dir = makeProj({ 'package.json': '{}', 'coverage/lcov.info': PY_LCOV });
      const { code, err } = runPythonIn(dir, ['--tokens'], fileSpawn(PY_LCOV));
      expect(code).toBe(0);
      expect(err.join('\n')).toMatch(/tokens: \d+ → \d+ \([+-]\d+%\)/);
      rmSync(dir, { recursive: true, force: true });
    });

    it('forwards missing-pytest install hint', () => {
      const dir = makeProj({ 'package.json': '{}' });
      const missing: SpawnFn = () => ({
        status: null,
        stdout: '',
        stderr: '',
        error: new Error('ENOENT'),
      });
      const { code, err } = runPythonIn(dir, [], missing);
      expect(code).toBe(1);
      expect(err.join('\n')).toContain('pip install pytest pytest-cov');
      rmSync(dir, { recursive: true, force: true });
    });

    it('forwards test failure stderr and exit code', () => {
      const dir = makeProj({ 'package.json': '{}' });
      const fail: SpawnFn = () => ({ status: 1, stdout: '', stderr: '1 failed\n' });
      const { code, err } = runPythonIn(dir, [], fail);
      expect(code).toBe(1);
      expect(err.join('\n')).toContain('exit code 1');
      expect(err.join('\n')).toContain('1 failed');
      rmSync(dir, { recursive: true, force: true });
    });
  });

  describe('deno command', () => {
    const denoOk: SpawnFn = () => ({ status: 0, stdout: DENO_LCOV, stderr: '' });

    it('runs deno test+coverage and prints TSV', () => {
      const dir = makeProj({ 'package.json': '{}' });
      const { code, out } = runDenoIn(dir, [], denoOk);
      expect(code).toBe(0);
      expect(out.join('\n')).toBe('file\tuncovered\ttotal\tpct\nsrc/math.ts\t2\t4\t50.0');
      rmSync(dir, { recursive: true, force: true });
    });

    it('prints token stats with --tokens', () => {
      const dir = makeProj({ 'package.json': '{}' });
      const { code, err } = runDenoIn(dir, ['--tokens'], denoOk);
      expect(code).toBe(0);
      expect(err.join('\n')).toMatch(/tokens: \d+ → \d+ \([+-]\d+%\)/);
      rmSync(dir, { recursive: true, force: true });
    });

    it('forwards missing-deno install hint', () => {
      const dir = makeProj({ 'package.json': '{}' });
      const missing: SpawnFn = () => ({
        status: null,
        stdout: '',
        stderr: '',
        error: new Error('ENOENT'),
      });
      const { code, err } = runDenoIn(dir, [], missing);
      expect(code).toBe(1);
      expect(err.join('\n')).toContain('https://deno.com');
      rmSync(dir, { recursive: true, force: true });
    });

    it('forwards test failure stderr and exit code', () => {
      const dir = makeProj({ 'package.json': '{}' });
      const fail: SpawnFn = () => ({ status: 1, stdout: '', stderr: 'FAILED\n' });
      const { code, err } = runDenoIn(dir, [], fail);
      expect(code).toBe(1);
      expect(err.join('\n')).toContain('exit code 1');
      expect(err.join('\n')).toContain('FAILED');
      rmSync(dir, { recursive: true, force: true });
    });
  });
});
