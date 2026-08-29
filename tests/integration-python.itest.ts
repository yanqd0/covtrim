import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { buildPath, integrationEnabled, toolAvailable } from './integration-helpers.ts';

// 集成验证：真实跑 pytest-cov（非 mock）。受 integrationEnabled() 开关控制（本地测、CI 跳）。
// pytest 由 python-demo/.venv 自包含提供（对齐 rust/node 的统一开关与 PATH 注入）。
const ROOT = process.cwd();
const ROOT_BIN = `${ROOT}/node_modules/.bin`;
const PY_DEMO = `${ROOT}/tests/fixtures/projects/python-demo`;
const PY_BIN = `${PY_DEMO}/.venv/bin`;
const PATH = buildPath(PY_BIN, ROOT_BIN);

function covtrimPython(args: string[], cwd: string): { code: number; out: string; err: string } {
  const r = spawnSync('tsx', [`${ROOT}/src/index.ts`, 'python', ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, PATH },
  });
  return { code: r.status ?? -1, out: r.stdout ?? '', err: r.stderr ?? '' };
}

const suite = integrationEnabled() ? describe : describe.skip;
suite('covtrim python integration', () => {
  (toolAvailable('pytest', { ...process.env, PATH }) ? it : it.skip)(
    'runs pytest-cov on python-demo and prints TSV',
    () => {
      const { code, out } = covtrimPython([], PY_DEMO);
      expect(code).toBe(0);
      expect(out).toContain('file\tuncovered\ttotal\tpct');
      expect(out).toContain('src/math.py');
    }
  );
});
