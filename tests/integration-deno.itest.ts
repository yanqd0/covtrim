import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { buildPath, integrationEnabled, toolAvailable } from './integration-helpers.ts';

// 集成验证：真实跑 deno test + deno coverage --lcov（非 mock）。受 integrationEnabled() 开关控制。
const ROOT = process.cwd();
const ROOT_BIN = `${ROOT}/node_modules/.bin`;
const DENO_DEMO = `${ROOT}/tests/fixtures/projects/deno-demo`;
const PATH = buildPath(ROOT_BIN); // deno 在系统 PATH

function covtrimDeno(args: string[], cwd: string): { code: number; out: string; err: string } {
  const r = spawnSync('tsx', [`${ROOT}/src/index.ts`, 'deno', ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, PATH },
  });
  return { code: r.status ?? -1, out: r.stdout ?? '', err: r.stderr ?? '' };
}

const suite = integrationEnabled() ? describe : describe.skip;
suite('covtrim deno integration', () => {
  (toolAvailable('deno', { ...process.env, PATH }) ? it : it.skip)(
    'runs deno test+coverage on deno-demo and prints TSV',
    () => {
      const { code, out } = covtrimDeno([], DENO_DEMO);
      expect(code).toBe(0);
      expect(out).toContain('file\tuncovered\ttotal\tpct');
      expect(out).toContain('src/math.ts');
    }
  );
});
