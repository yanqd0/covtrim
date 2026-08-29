import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

// 集成验证：真实跑框架（非 mock）。需本机工具链；vitest 必装（covtrim 自身依赖），其余探测可用则跑、否则 skip。
const ROOT = process.cwd();
const BIN = `${ROOT}/node_modules/.bin`;
const DEMO = `${ROOT}/tests/fixtures/projects/node-demo`;
const FAILING = `${ROOT}/tests/fixtures/projects/node-demo-failing`;

interface CovtrimResult {
  code: number;
  out: string;
  err: string;
}

/** 在指定 cwd 下运行 covtrim node（PATH 注入项目 node_modules/.bin，供 vitest 等从父目录链解析）。 */
function covtrimNode(args: string[], cwd: string): CovtrimResult {
  const r = spawnSync('tsx', [`${ROOT}/src/index.ts`, 'node', ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${BIN}:${process.env.PATH ?? ''}` },
  });
  return { code: r.status ?? -1, out: r.stdout ?? '', err: r.stderr ?? '' };
}

function toolAvailable(cmd: string): boolean {
  const r = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
  return r.error === undefined && r.status === 0;
}

describe('covtrim node integration', () => {
  it('runs vitest on node-demo and prints TSV', () => {
    const { code, out } = covtrimNode(['--framework', 'vitest'], DEMO);
    expect(code).toBe(0);
    expect(out).toContain('file\tuncovered\ttotal\tpct');
    expect(out).toContain('src/math.js');
  });

  (toolAvailable('jest') ? it : it.skip)('runs jest on node-demo and prints TSV', () => {
    const { code, out } = covtrimNode(['--framework', 'jest'], DEMO);
    expect(code).toBe(0);
    expect(out).toContain('src/math.js');
  });

  (toolAvailable('nyc') && toolAvailable('mocha') ? it : it.skip)(
    'runs mocha+nyc on node-demo and prints TSV',
    () => {
      const { code, out } = covtrimNode(['--framework', 'mocha-nyc', '--', 'mocha/run.test.js'], DEMO);
      expect(code).toBe(0);
      expect(out).toContain('src/math.js');
    }
  );

  (toolAvailable('c8') ? it : it.skip)('runs c8 node:test on node-demo and prints TSV', () => {
    const { code, out } = covtrimNode(['--framework', 'node-test', '--', 'node/run.test.js'], DEMO);
    expect(code).toBe(0);
    expect(out).toContain('src/math.js');
  });

  (toolAvailable('bun') ? it : it.skip)('runs bun on node-demo and prints TSV', () => {
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
