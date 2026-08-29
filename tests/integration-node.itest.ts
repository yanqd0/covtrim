import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { buildPath, integrationEnabled, toolAvailable } from './integration-helpers.ts';

// 集成验证：真实跑框架（非 mock）。受 integrationEnabled() 开关控制（本地测、CI 跳），
// 框架级 toolAvailable 探测 demo 内已装框架（package.json 统一管理）。
const ROOT = process.cwd();
const ROOT_BIN = `${ROOT}/node_modules/.bin`;
const DEMO = `${ROOT}/tests/fixtures/projects/node-demo`;
const DEMO_BIN = `${DEMO}/node_modules/.bin`;
const FAILING = `${ROOT}/tests/fixtures/projects/node-demo-failing`;
const PATH = buildPath(DEMO_BIN, ROOT_BIN);

interface CovtrimResult {
  code: number;
  out: string;
  err: string;
}

/** 在指定 cwd 下运行 covtrim node（PATH 注入 demo 与项目 .bin）。 */
function covtrimNode(args: string[], cwd: string): CovtrimResult {
  const r = spawnSync('tsx', [`${ROOT}/src/index.ts`, 'node', ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, PATH },
  });
  return { code: r.status ?? -1, out: r.stdout ?? '', err: r.stderr ?? '' };
}

const suite = integrationEnabled() ? describe : describe.skip;
suite('covtrim node integration', () => {
  it('runs vitest on node-demo and prints TSV', () => {
    const { code, out } = covtrimNode(['--framework', 'vitest'], DEMO);
    expect(code).toBe(0);
    expect(out).toContain('file\tuncovered\ttotal\tpct');
    expect(out).toContain('src/math.js');
  });

  (toolAvailable('jest', { ...process.env, PATH }) ? it : it.skip)('runs jest on node-demo and prints TSV', () => {
    const { code, out } = covtrimNode(['--framework', 'jest'], DEMO);
    expect(code).toBe(0);
    expect(out).toContain('src/math.js');
  });

  (toolAvailable('nyc', { ...process.env, PATH }) && toolAvailable('mocha', { ...process.env, PATH }) ? it : it.skip)(
    'runs mocha+nyc on node-demo and prints TSV',
    () => {
      const { code, out } = covtrimNode(['--framework', 'mocha-nyc', '--', 'mocha/run.test.js'], DEMO);
      expect(code).toBe(0);
      expect(out).toContain('src/math.js');
    }
  );

  (toolAvailable('c8', { ...process.env, PATH }) ? it : it.skip)('runs c8 node:test on node-demo and prints TSV', () => {
    const { code, out } = covtrimNode(['--framework', 'node-test', '--', 'node/run.test.js'], DEMO);
    expect(code).toBe(0);
    expect(out).toContain('src/math.js');
  });

  (toolAvailable('bun', { ...process.env, PATH }) ? it : it.skip)('runs bun on node-demo and prints TSV', () => {
    const { code, out } = covtrimNode(['--framework', 'bun', '--', 'bun/run.test.js'], DEMO);
    expect(code).toBe(0);
    expect(out).toContain('src/math.js');
  });

  it('forwards test failure and non-zero exit from node-demo-failing', () => {
    const { code, err } = covtrimNode(['--framework', 'vitest'], FAILING);
    expect(code).toBe(1);
    expect(err).toContain('exit code');
    expect(err).toContain('intentional failure');
  });
});
